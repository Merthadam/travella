"""One-off Chrome DevTools MCP evidence capture; no durable Plan mutations."""
import asyncio, json, re
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT=Path.cwd()
OUT=ROOT/'artifacts/testing/2026-10-23-aligned-loader'
URL='http://localhost:5187/plans?prototype=canvas-globe-topbar&variant='

async def main():
    params=StdioServerParameters(command='npx',args=['--offline','chrome-devtools-mcp','--headless','--isolated','--no-usage-statistics','--no-performance-crux','--workspace',str(ROOT),'--viewport','1440x1000'])
    async with stdio_client(params) as (reader,writer):
      async with ClientSession(reader,writer) as session:
        await session.initialize()
        async def call(name,args):
            result=await asyncio.wait_for(session.call_tool(name,args),40)
            text='\n'.join(c.text for c in result.content if c.type=='text')
            if result.isError: raise RuntimeError(name+': '+text)
            return text
        page=await call('new_page',{'url':URL+'A'})
        ids=re.findall(r'^(\d+):.*\[selected\]',page,re.M)
        if not ids: raise RuntimeError('Could not identify the isolated prototype page.')
        pid=int(ids[-1])
        async def evaluate(source):
            result=await call('evaluate_script',{'pageId':pid,'function':source})
            match=re.search(r'```json\n(.*?)\n```',result,re.S)
            return json.loads(match.group(1)) if match else result
        account=json.loads((Path.home()/'.config/travella/test-account.json').read_text())
        creds=json.dumps({k:account[k] for k in ['email','password']})
        status=await evaluate('async () => {const r=await fetch("/auth/sign-in",{method:"POST",headers:{"Content-Type":"application/json","X-Travella-Request":"1"},body:JSON.stringify('+creds+')});return r.status;}')
        if status!=200: raise RuntimeError('Example-account authentication failed; no retry: HTTP '+str(status))
        print('Example-account authentication passed.',flush=True)
        await call('navigate_page',{'pageId':pid,'type':'reload'})
        async def ready():
            result=await evaluate('async () => {for(let i=0;i<60;i++){if(document.querySelector(".cg-prototype"))return true;await new Promise(r=>setTimeout(r,100));}return false;}')
            if result is not True: raise RuntimeError('Prototype did not appear.')
        await ready()
        outcomes={}
        await call('navigate_page',{'pageId':pid,'url':URL+'C'});await ready()
        await call('emulate',{'pageId':pid,'viewport':'1440x1000x1','prefersReducedMotion':'no-preference'});await ready()
        await evaluate('() => {document.documentElement.dataset.theme="light";return true;}')
        async def click(label):
            return await evaluate('async () => {const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==='+json.dumps(label)+');if(!b)throw Error("Missing button");b.click();await new Promise(r=>setTimeout(r,100));return true;}')
        async def shot(name):
            await call('take_screenshot',{'pageId':pid,'filePath':str(OUT/'plan'/name),'fullPage':True})
        animation=await evaluate('''async () => {
          const sleep=ms=>new Promise(r=>setTimeout(r,ms));
          [...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Replay').click();await sleep(80);
          const width=()=>document.querySelector('.cg-copilot-slot').getBoundingClientRect().width;
          const start=width();await sleep(430);const middle=width();await sleep(1050);const end=width();
          return {start,middle,end,transition:getComputedStyle(document.querySelector('.cg-aligned-columns')).transitionDuration,blocked:document.querySelector('#canvas-chat-message').disabled};
        }''')
        assert animation['start']<animation['middle']<animation['end'] and animation['end']==400 and animation['blocked'],animation
        outcomes['opening']=animation
        await shot('research-desktop.png');print('Sidebar opening animation verified.',flush=True)
        phase=await evaluate('''async () => {const globe=document.querySelector('.cg-globe');for(let i=0;i<6;i++){[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='+1 item').click();await new Promise(r=>setTimeout(r,70));}return {sameGlobe:globe===document.querySelector('.cg-globe'),active:document.querySelector('[aria-current=step]').textContent,animation:getComputedStyle(document.querySelector('.cg-longitude')).animationName,cards:document.querySelectorAll('.cg-aligned-samples').length};}''')
        assert phase['sameGlobe'] and phase['active']=='2Canvas' and phase['animation']!='none' and phase['cards']==0,phase
        outcomes['phase']=phase
        await shot('canvas-desktop.png')
        folding=await evaluate('''async () => {const sleep=ms=>new Promise(r=>setTimeout(r,ms));document.querySelector('[aria-label="Collapse plan chat"]').click();await sleep(1200);const closed=document.querySelector('.cg-copilot-slot').inert;const width=document.querySelector('.cg-copilot-slot').getBoundingClientRect().width;document.querySelector('[aria-label="Expand plan chat"]').click();await sleep(1200);return {closed,width,open:!document.querySelector('.cg-copilot-slot').inert};}''')
        assert folding['closed'] and folding['width']==56 and folding['open'],folding
        outcomes['folding']=folding
        await click('Simulate error');assert await evaluate('() => !!document.querySelector(".gt-error")')
        await click('Try again');await click('Pause demo')
        await click('Cancel generation ↗');assert await evaluate('() => !!document.querySelector(".gt-cancelled")')
        await click('Build my plan');await click('Pause demo');await click('Finish')
        complete=await evaluate('() => ({cards:document.querySelectorAll(".cg-aligned-samples .ds-card").length,loader:!!document.querySelector(".cg-loading"),composer:!document.querySelector("#canvas-chat-message").disabled})')
        assert complete=={'cards':3,'loader':False,'composer':True},complete
        await shot('complete-desktop.png')
        edits=await evaluate('''async () => {const sleep=()=>new Promise(r=>setTimeout(r,100));document.querySelector('[aria-label="Edit details"]').click();await sleep();const form=!!document.querySelector('.ds-essentials form');document.querySelector('.ds-essentials .ds-form-actions button').click();await sleep();document.querySelector('.canvas-chat-starters button').click();await sleep();return {form,closed:!document.querySelector('.ds-essentials form'),messages:document.querySelectorAll('.canvas-chat-message').length};}''')
        assert edits=={'form':True,'closed':True,'messages':2},edits
        outcomes['completion']={**complete,**edits}
        await click('Replay')
        await evaluate('async () => {document.documentElement.dataset.theme="dark";await new Promise(r=>setTimeout(r,1500));return true;}')
        await shot('research-desktop-dark.png')
        await call('emulate',{'pageId':pid,'prefersReducedMotion':'reduce'})
        reduced=await evaluate('() => ({globe:getComputedStyle(document.querySelector(".cg-longitude")).animationName,transition:getComputedStyle(document.querySelector(".cg-aligned-columns")).transitionDuration})')
        assert reduced=={'globe':'none','transition':'0s'},reduced
        outcomes['desktopReducedMotion']=reduced
        await call('emulate',{'pageId':pid,'viewport':'390x844x1,mobile,touch','prefersReducedMotion':'reduce'});await ready()
        await evaluate('async () => {document.documentElement.dataset.theme="light";await new Promise(r=>setTimeout(r,250));return true;}')
        mobile=await evaluate('() => ({overflow:document.documentElement.scrollWidth>innerWidth,globe:getComputedStyle(document.querySelector(".cg-longitude")).animationName,transition:getComputedStyle(document.querySelector(".cg-aligned-columns")).transitionDuration,chatHidden:getComputedStyle(document.querySelector(".cg-copilot-slot")).display})')
        assert not mobile['overflow'] and mobile['globe']=='none' and mobile['transition']=='0s' and mobile['chatHidden']=='none',mobile
        await shot('research-mobile.png')
        await click('Conversation');await shot('chat-mobile.png')
        assert await evaluate('() => getComputedStyle(document.querySelector(".cg-aligned-main")).display==="none" && document.querySelector("#canvas-chat-message").disabled')
        await evaluate('() => {document.documentElement.dataset.theme="dark";return true;}');await shot('chat-mobile-dark.png')
        await click('Plan & map');await shot('research-mobile-dark.png')
        outcomes['mobile']=mobile
        outcomes['console']=await call('list_console_messages',{'pageId':pid,'types':['error','warn']})
        outcomes['network']=await call('list_network_requests',{'pageId':pid,'resourceTypes':['fetch','xhr']})
        (OUT/'browser-results.json').write_text(json.dumps(outcomes,indent=2)+'\n')
        await evaluate('async () => {const r=await fetch("/auth/sign-out",{method:"POST",headers:{"Content-Type":"application/json","X-Travella-Request":"1"},body:"{}"});return {status:r.status};}')
        print('All aligned prototype browser checks passed.',flush=True)

asyncio.run(main())

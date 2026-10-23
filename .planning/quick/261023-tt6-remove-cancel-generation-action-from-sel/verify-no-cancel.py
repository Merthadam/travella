"""One-off Chrome DevTools MCP evidence capture; no durable Plan mutations."""
import asyncio, json, re
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT=Path.cwd()
OUT=ROOT/'artifacts/testing/2026-10-23-loader-no-cancel'
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
        for mode,viewport in [('desktop','1440x1000x1'),('mobile','390x844x1,mobile,touch')]:
            await call('emulate',{'pageId':pid,'viewport':viewport});await ready()
            result=await evaluate('() => ({cancel:!!document.querySelector(".cg-cancel"),globe:!!document.querySelector(".cg-globe"),progress:!!document.querySelector(".gt-steps"),overflow:document.documentElement.scrollWidth>innerWidth})')
            assert not result['cancel'] and result['globe'] and result['progress'] and not result['overflow'],result
            await call('take_screenshot',{'pageId':pid,'filePath':str(OUT/'plan'/f'{mode}.png'),'fullPage':True})
            outcomes[mode]=result
        actions=await evaluate('''async () => {const click=async label=>{[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===label).click();await new Promise(r=>setTimeout(r,100));};await click('Simulate error');const error=!!document.querySelector('.gt-error');await click('Try again');await click('Pause demo');const retry=document.querySelector('.cg-count').textContent;await click('Finish');return {error,retry,cards:document.querySelectorAll('.cg-sample-card').length,loader:!!document.querySelector('.cg-loading')};}''')
        assert actions=={'error':True,'retry':'00','cards':3,'loader':False},actions
        outcomes['actions']=actions
        outcomes['console']=await call('list_console_messages',{'pageId':pid,'types':['error','warn']})
        outcomes['network']=await call('list_network_requests',{'pageId':pid,'resourceTypes':['fetch','xhr']})
        (OUT/'browser-results.json').write_text(json.dumps(outcomes,indent=2)+'\n')
        await evaluate('async () => {const r=await fetch("/auth/sign-out",{method:"POST",headers:{"Content-Type":"application/json","X-Travella-Request":"1"},body:"{}"});return r.status;}')
        print('Desktop/mobile absence and retry/completion checks passed.',flush=True)

asyncio.run(main())

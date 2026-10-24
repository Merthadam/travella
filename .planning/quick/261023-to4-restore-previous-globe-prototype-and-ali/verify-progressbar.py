"""One-off Chrome DevTools MCP evidence capture; no durable Plan mutations."""
import asyncio, json, re
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT=Path.cwd()
OUT=ROOT/'artifacts/testing/2026-10-23-progressbar-only'
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
        for variant in 'C':
            await call('navigate_page',{'pageId':pid,'url':URL+variant})
            await ready()
            await call('emulate',{'pageId':pid,'viewport':'1440x1000x1','prefersReducedMotion':'no-preference'})
            await ready()
            initial=await evaluate('() => ({topbar:!!document.querySelector(".gt-topbar"),globeB:!!document.querySelector(".cg-variant-b"),unknownTotal:!document.querySelector("[aria-valuenow]"),count:document.querySelector(".cg-count").textContent,overflow:document.documentElement.scrollWidth>innerWidth,canvasCards:document.querySelectorAll(".cg-sample-card").length,chatVisible:getComputedStyle(document.querySelector(".cg-chat")).display!=="none"})')
            width=await evaluate('() => {const bar=document.querySelector(".gt-steps"),rail=bar.querySelector("ol");const style=getComputedStyle(bar);return {available:bar.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),actual:rail.getBoundingClientRect().width};}')
            assert abs(width['available']-width['actual'])<1,width
            assert initial['topbar'] and initial['globeB'] and initial['unknownTotal'] and initial['count']=='04' and not initial['overflow'] and initial['canvasCards']==0,initial
            await call('take_screenshot',{'pageId':pid,'filePath':str(OUT/'plan'/f'variant-{variant.lower()}-desktop.png'),'fullPage':True})
            print('Captured desktop '+variant,flush=True)
            phaseChecks=await evaluate('''async () => {
              const globe=document.querySelector('.cg-globe');
              const active=()=>document.querySelector('[aria-current=step]')?.textContent;
              const before=active();const animation=getComputedStyle(document.querySelector('.cg-longitude')).animationName;
              for(let i=0;i<2;i++){[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='+1 item').click();await new Promise(r=>setTimeout(r,100));}
              return {before,after:active(),sameGlobe:globe===document.querySelector('.cg-globe'),animation,afterAnimation:getComputedStyle(document.querySelector('.cg-longitude')).animationName,steps:[...document.querySelectorAll('.gt-steps li:not(.gt-step-link)')].map(x=>x.textContent),cards:document.querySelectorAll('.cg-sample-card').length};
            }''')
            assert phaseChecks['before']=='1Research' and phaseChecks['after']=='2Canvas' and phaseChecks['sameGlobe'] and phaseChecks['animation']!='none' and phaseChecks['afterAnimation']!='none' and len(phaseChecks['steps'])==2 and phaseChecks['cards']==0,phaseChecks
            await call('take_screenshot',{'pageId':pid,'filePath':str(OUT/'plan'/'canvas-phase-desktop.png'),'fullPage':True})
            await call('navigate_page',{'pageId':pid,'type':'reload'});await ready()

            interactions=await evaluate('''async () => {
              const tick=()=>new Promise(r=>setTimeout(r,100));
              const click=async label=>{const el=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===label);if(!el)throw Error('Missing '+label);el.click();await tick();};
              const out={}; await click('+1 item');out.increment=document.querySelector('.cg-count').textContent;
              await click('Cancel generation ↗');out.cancel=document.querySelector('.cg-stopped h2').textContent;out.topbarCancelled=!!document.querySelector('.gt-cancelled');
              await click('Build my plan');await click('Pause demo');out.retry=document.querySelector('.cg-count').textContent;
              await click('Simulate error');out.error=document.querySelector('.cg-stopped h2').textContent;out.topbarError=!!document.querySelector('.gt-error');
              await click('Try again');await click('Pause demo');await click('Finish');
              out.topbarComplete=!!document.querySelector('.gt-complete');out.complete={cards:document.querySelectorAll('.cg-sample-card').length,loader:!!document.querySelector('.cg-loading')};
              document.querySelector('.cg-sample-card').click();await tick();out.cardOpens=!!document.querySelector('[role=dialog]');await click('Back to canvas');
              await click('Replay');out.replay=document.querySelector('.cg-count').textContent;
              const boxes=[...document.querySelectorAll('.cg-demo-options input')];boxes[0].click();await tick();out.backgroundInert=document.querySelector('.cg-sample-background').inert;
              boxes[1].click();await tick();out.reducedMotion=getComputedStyle(document.querySelector('.cg-longitude')).animationName;
              boxes[0].click();boxes[1].click();await tick();return out;
            }''')
            assert interactions['topbarCancelled'] and interactions['topbarError'] and interactions['topbarComplete'] and interactions['increment']=='05' and interactions['retry']=='00' and interactions['complete']=={'cards':3,'loader':False} and interactions['cardOpens'] and interactions['backgroundInert'] and interactions['reducedMotion']=='none',interactions
            await call('navigate_page',{'pageId':pid,'type':'reload'});await ready()
            await call('emulate',{'pageId':pid,'viewport':'390x844x1,mobile,touch','prefersReducedMotion':'reduce'})
            await ready()
            mobile=await evaluate('() => ({overflow:document.documentElement.scrollWidth>innerWidth,animation:getComputedStyle(document.querySelector(".cg-longitude")).animationName,counter:document.querySelector(".cg-counter").innerText})')
            assert not mobile['overflow'] and mobile['animation']=='none',mobile
            await call('take_screenshot',{'pageId':pid,'filePath':str(OUT/'plan'/f'variant-{variant.lower()}-mobile.png'),'fullPage':True})
            await evaluate('''async () => {for(let i=0;i<2;i++){[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='+1 item').click();await new Promise(r=>setTimeout(r,100));}return true;}''')
            await call('take_screenshot',{'pageId':pid,'filePath':str(OUT/'plan'/'canvas-phase-mobile.png'),'fullPage':True})
            print('Captured mobile and checked interactions '+variant,flush=True)
            console=await call('list_console_messages',{'pageId':pid,'types':['error','warn']})
            network=await call('list_network_requests',{'pageId':pid,'resourceTypes':['fetch','xhr']})
            outcomes[variant]={'width':width,'phases':phaseChecks,'initial':initial,'interactions':interactions,'mobile':mobile,'console':console,'network':network}
        await call('emulate',{'pageId':pid,'viewport':'1440x1000x1','prefersReducedMotion':'no-preference'})
        await ready()
        keyboard=await evaluate('''async () => {document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await new Promise(r=>setTimeout(r,150));return new URL(location.href).searchParams.get('variant');}''')
        assert keyboard=='A',keyboard
        await call('navigate_page',{'pageId':pid,'type':'reload'});await ready()
        persisted=await evaluate('() => new URL(location.href).searchParams.get("variant")')
        assert persisted=='A',persisted
        await call('navigate_page',{'pageId':pid,'url':URL+'C'});await ready()
        await evaluate('''async () => {const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Run demo');b.click();await new Promise(r=>setTimeout(r,1800));return document.querySelector('.cg-count').textContent;}''')
        await evaluate('''async () => {const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Finish');b.click();await new Promise(r=>setTimeout(r,100));return true;}''')
        await call('take_screenshot',{'pageId':pid,'filePath':str(OUT/'plan'/'completed-canvas-desktop.png'),'fullPage':True})
        outcomes['switcher']={'wrap':'C to A','reload':persisted}
        (OUT/'browser-results.json').write_text(json.dumps(outcomes,indent=2)+'\n')
        # Only sign out the isolated verification session, preserving the user's browser session.
        await evaluate('async () => {const r=await fetch("/auth/sign-out",{method:"POST",headers:{"Content-Type":"application/json","X-Travella-Request":"1"},body:"{}"});return {status:r.status};}')
        print('All variant interactions, mobile overflow, reduced motion and URL switching passed.',flush=True)

asyncio.run(main())

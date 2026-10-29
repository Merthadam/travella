"""Interactive isolated Chrome DevTools MCP verification; credentials never logged."""
import asyncio, json, re, sys, termios
if sys.stdin.isatty():
    mode=termios.tcgetattr(sys.stdin); mode[3] &= ~(termios.ICANON | termios.ECHO); termios.tcsetattr(sys.stdin,termios.TCSANOW,mode)
from pathlib import Path
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
ROOT=Path.cwd()
OUT=ROOT/'artifacts/testing/2026-10-29-guided-stays-checkout'
async def main():
    params=StdioServerParameters(command='npx',args=['--offline','chrome-devtools-mcp','--headless','--isolated','--no-usage-statistics','--no-performance-crux','--workspace',str(ROOT),'--viewport','1440x1000'])
    async with stdio_client(params) as (reader,writer):
      async with ClientSession(reader,writer) as session:
        await session.initialize()
        async def call(name,args):
            result=await asyncio.wait_for(session.call_tool(name,args),50)
            text='\n'.join(c.text for c in result.content if c.type=='text')
            text=re.sub(r'AIza[0-9A-Za-z_-]{20,}', '[REDACTED_BROWSER_API_KEY]', text)
            text=re.sub(r'gAAAAA[0-9A-Za-z_=-]{40,}', '[REDACTED_CHECKOUT_HANDLE]', text)
            text=re.sub(r'(?im)^- (?:cookie|set-cookie|authorization):[^\n]*', '- sensitive-header:[REDACTED]', text)
            if result.isError: raise RuntimeError(name+': '+text)
            match=re.search(r'```json\n(.*?)\n```',text,re.S)
            return json.loads(match.group(1)) if match else text
        page=await call('new_page',{'url':'http://localhost:5198/plans'})
        pid=int(re.findall(r'^(\d+):.*\[selected\]',page,re.M)[-1])
        account=json.loads((Path.home()/'.config/travella/test-account.json').read_text())
        creds=json.dumps({k:account[k] for k in ['email','password']})
        status=await call('evaluate_script',{'pageId':pid,'function':'async () => {const r=await fetch("/auth/sign-in",{method:"POST",headers:{"Content-Type":"application/json","X-Travella-Request":"1"},body:JSON.stringify('+creds+')});return r.status;}'})
        async def authenticate():
            return await call('evaluate_script',{'pageId':pid,'function':'async () => {const r=await fetch("/auth/sign-in",{method:"POST",headers:{"Content-Type":"application/json","X-Travella-Request":"1"},body:JSON.stringify('+creds+')});return r.status;}'})
        assert status==200, 'Authentication failed'
        await call('navigate_page',{'pageId':pid,'type':'reload'})
        print('READY: authenticated example-account Chrome DevTools session',flush=True)
        record_path = OUT/"browser-results.json"
        records=json.loads(record_path.read_text()) if record_path.exists() else []
        while True:
            line=await asyncio.to_thread(sys.stdin.readline)
            if not line or line.strip()=='exit':break
            try:
                command=json.loads(line)
                name=command.get('tool','evaluate_script')
                args=command.get('args',{'function':command.get('js','')})
                args['pageId']=pid
                result=await authenticate() if name=='__auth' else await call(name,args)
                records.append({'command':command,'result':result})
                (OUT/'browser-results.json').write_text(json.dumps(records,indent=2)+'\n')
                print(json.dumps(result),flush=True)
            except Exception as exc:print('ERROR: '+str(exc),flush=True)
asyncio.run(main())

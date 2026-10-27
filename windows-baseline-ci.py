import datetime,json,subprocess
from pathlib import Path
out=Path(__file__).parent
root=Path('F:/Github-PR/inspection/discovery-20261027-js-pino-pretty-baseline')
cmd=['E:/Nodejs/node.EXE','C:/Users/lyz/AppData/Roaming/npm/node_modules/npm/bin/npm-cli.js','run','ci']
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
with (out/'windows-baseline-full-ci.log').open('wb') as log:
    p=subprocess.Popen(cmd,cwd=root,stdout=log,stderr=subprocess.STDOUT)
    terminated=False
    try: p.wait(timeout=180)
    except subprocess.TimeoutExpired:
        terminated=True
        k=subprocess.run(['taskkill','/PID',str(p.pid),'/T','/F'],capture_output=True)
        (out/'windows-baseline-full-ci-termination.log').write_bytes(k.stdout+k.stderr)
        p.wait()
(out/'windows-baseline-full-ci-done.json').write_text(json.dumps(dict(command=cmd,code=p.returncode,outerTerminationAfter180Seconds=terminated,startedAt=start,finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat()),indent=2),encoding='utf8')

import datetime,json,subprocess,time
from pathlib import Path
root=Path('F:/Github-PR/inspection/discovery-20261027-js-pino-pretty')
out=Path('F:/Github-PR/ci-evidence/discovery-20261027-js')
cmd=['E:/Nodejs/node.EXE','C:/Users/lyz/AppData/Roaming/npm/node_modules/npm/bin/npm-cli.js','run','ci']
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
with (out/'windows-full-ci.log').open('wb') as log:
    p=subprocess.run(cmd,cwd=root,stdout=log,stderr=subprocess.STDOUT)
(out/'windows-full-ci-done.json').write_text(json.dumps(dict(command=cmd,code=p.returncode,startedAt=start,finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat()),indent=2),encoding='utf8')

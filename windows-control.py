import datetime,hashlib,json,os,subprocess,tarfile,time
from pathlib import Path
out=Path(__file__).parent
candidate=Path('F:/Github-PR/inspection/discovery-20261027-js-pino-pretty')
baseline=Path('F:/Github-PR/inspection/discovery-20261027-js-pino-pretty-baseline')
baseline.mkdir(exist_ok=True)
with tarfile.open(out/'pino-canonical-base.tar') as archive: archive.extractall(baseline,filter='data')
if not (baseline/'node_modules').exists():
    p=subprocess.run(['powershell','-NoProfile','-Command',f"New-Item -ItemType Junction -Path '{baseline}/node_modules' -Target '{candidate}/node_modules' | Out-Null"],capture_output=True)
    assert p.returncode==0,p.stderr
states=[]
for kind,root in [('baseline',baseline),('candidate',candidate)]:
    cmd=['E:/Nodejs/node.EXE','--test','--test-timeout=30000','--test-name-pattern=loads and applies default config file: pino-pretty.config.js','test/cli-rc.test.js']
    started=datetime.datetime.now(datetime.timezone.utc).isoformat()
    with (out/f'windows-cli-rc-{kind}-control.log').open('wb') as log:
        p=subprocess.Popen(cmd,cwd=root,stdout=log,stderr=subprocess.STDOUT)
        terminated=False
        try: p.wait(timeout=45)
        except subprocess.TimeoutExpired:
            terminated=True
            kill=subprocess.run(['taskkill','/PID',str(p.pid),'/T','/F'],capture_output=True)
            (out/f'windows-cli-rc-{kind}-termination.log').write_bytes(kill.stdout+kill.stderr)
            p.wait()
    states.append(dict(kind=kind,command=cmd,cwd=str(root),code=p.returncode,terminatedAfter45Seconds=terminated,sourceSha256=hashlib.sha256((root/'lib/pretty.js').read_bytes()).hexdigest(),testSha256=hashlib.sha256((root/'test/cli-rc.test.js').read_bytes()).hexdigest(),startedAt=started,finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat()))
    (out/'windows-cli-rc-control-summary.json').write_text(json.dumps(states,indent=2),encoding='utf8')

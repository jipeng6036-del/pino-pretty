import datetime,hashlib,json,subprocess
from pathlib import Path
out=Path(__file__).parent
root=Path('F:/Github-PR/inspection/discovery-20261027-js-pino-consumer')
root.mkdir(exist_ok=True)
(root/'package.json').write_text('{"private":true}',encoding='utf8')
node='E:/Nodejs/node.EXE'
npm='C:/Users/lyz/AppData/Roaming/npm/node_modules/npm/bin/npm-cli.js'
states=[]
for name,cmd,cwd in [
 ('windows-packed-install',[node,npm,'i','--ignore-scripts',str(out/'pino-pretty-13.2.0.tgz'),'pino@^10.0.0'],root),
 ('windows-packed-runtime',[node,str(out/'packed-probe.cjs'),str(root),str(out/'windows-packed-runtime')],root),
 ('windows-types',[node,npm,'run','test:types'],Path('F:/Github-PR/inspection/discovery-20261027-js-pino-pretty'))]:
    start=datetime.datetime.now(datetime.timezone.utc).isoformat()
    with (out/(name+'.log')).open('wb') as log: p=subprocess.run(cmd,cwd=cwd,stdout=log,stderr=subprocess.STDOUT)
    states.append(dict(name=name,command=cmd,cwd=str(cwd),code=p.returncode,startedAt=start,finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat()))
    (out/'windows-packed-states.json').write_text(json.dumps(states,indent=2),encoding='utf8')
    assert p.returncode==0,name
info=json.loads((out/'linux-package-meta.json').read_text())
manifest=json.loads((out/'pino-candidate-manifest.json').read_text())
checked=[]
for f in info['files']:
    data=(root/'node_modules/pino-pretty'/f['path']).read_bytes()
    expected=next(x for x in manifest['files'] if x['path']==f['path'])
    sha=hashlib.sha256(data).hexdigest()
    assert sha==expected['sha256'],f['path']
    checked.append(dict(path=f['path'],sha256=sha,bytes=len(data)))
(out/'windows-packed-source-audit.json').write_text(json.dumps(dict(tree=manifest['tree'],files=checked),indent=2),encoding='utf8')
runtime=json.loads((out/'windows-packed-runtime.json').read_text())
assert runtime['passed']==3
(out/'windows-packed-done.json').write_text(json.dumps(dict(code=0,passed=runtime['passed'],sourceFiles=len(checked),finishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat()),indent=2),encoding='utf8')

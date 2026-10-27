import hashlib, io, json, subprocess, tarfile
from pathlib import Path
ROOT=Path('F:/Github-PR/inspection/discovery-20261027-js-pino-pretty')
OUT=Path('F:/Github-PR/ci-evidence/discovery-20261027-js')
def git(*a): return subprocess.check_output(['git','-C',str(ROOT),*a])
tree=git('write-tree').decode().strip()
records=[]
with tarfile.open(OUT/'pino-canonical-candidate.tar','w') as archive:
    for item in git('ls-files','--stage','-z').split(b'\0'):
        if not item: continue
        header,name=item.split(b'\t',1); mode,blob,stage=header.decode().split(); name=name.decode()
        assert stage=='0'
        data=git('cat-file','blob',blob)
        assert (ROOT/name).read_bytes()==data,name
        record=dict(path=name,mode=mode,blob=blob,bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
        records.append(record)
        entry=tarfile.TarInfo(name); entry.mode=int(mode,8)&0o777; entry.size=len(data); entry.mtime=0
        archive.addfile(entry,io.BytesIO(data))
result=dict(base=git('rev-parse','HEAD').decode().strip(),tree=tree,files=records)
(OUT/'pino-candidate-manifest.json').write_text(json.dumps(result,indent=2),encoding='utf8')
(OUT/'candidate.diff').write_bytes(git('diff','--cached','--binary'))
print(json.dumps(dict(base=result['base'],tree=tree,files=len(records))))

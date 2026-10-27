import sys,json,datetime
from pathlib import Path
sys.path.insert(0,'F:/Github-PR/ci-evidence')
from sol_high_serial_gh import gh
out=Path(__file__).parent
meta=gh('api','repos/pinojs/pino-pretty')
(out/'fresh-repository-meta.json').write_text(json.dumps(meta,indent=2),encoding='utf8')
print(json.dumps({key:meta.get(key) for key in ['full_name','archived','disabled','default_branch','pull_request_creation_policy','allow_forking']}))
assert meta.get('pull_request_creation_policy')=='all', 'PR creation is restricted'

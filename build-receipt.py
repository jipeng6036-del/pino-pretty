import datetime,hashlib,json,subprocess
from pathlib import Path
out=Path(__file__).parent.resolve()
root=Path('F:/Github-PR/inspection/discovery-20261027-js-pino-pretty')
def read(name):return json.loads((out/name).read_text())
def git(*args):return subprocess.check_output(['git',*args],cwd=root).decode().strip()
manifest=read('pino-candidate-manifest.json')
assert git('write-tree')==manifest['tree']
assert all(hashlib.sha256((root/f['path']).read_bytes()).hexdigest()==f['sha256'] for f in manifest['files'])
matrix=read('linux-matrix-states.json')
required=[s for s in matrix if any(s['name'].endswith(x) for x in ['-install-ignore-scripts','-install-pino10','-ci'])]
assert len(required)==9 and all(s['code']==0 for s in required)
assert read('linux-matrix-done.json')['code']==0
linux=read('linux-final-source-audit.json')
assert all(not s['mismatches'] for s in linux['sources'])
assert read('linux-packed-configured-done.json')['passed']==3
assert read('windows-packed-done.json')['passed']==3
for prefix in ['linux-packed-configured','windows-packed-runtime']:
    runtime=read(prefix+'.json'); assert runtime['passed']==3
    for artifact in runtime['artifacts']:
        raw=(out/artifact['file']).read_bytes()
        assert len(raw)==artifact['bytes'] and hashlib.sha256(raw).hexdigest()==artifact['sha256']
meta=read('fresh-repository-meta.json');fresh=read('fresh-qualification.json')['data']['repository']
assert meta['pull_request_creation_policy']=='all'
assert fresh['defaultBranchRef']['target']['oid']==manifest['base']
assert fresh['issue']['state']=='OPEN' and not fresh['issue']['assignees']['nodes']
assert fresh['prs']['totalCount']==13 and not fresh['prs']['pageInfo']['hasNextPage']
for major,count in [(20,388),(22,361),(24,361)]:
    text=(out/f'linux-node{major}-ci.log').read_text()
    assert f'Passed: {count}' in text and 'Failed: 0' in text and 'No problems found' in text
extra=read('linux-extra-states.json')
assert all(s['code']==0 for s in extra if 'benchmark' in s['name'])
receipt=dict(repository='pinojs/pino-pretty',issue=211,base=manifest['base'],tree=manifest['tree'],sourceFiles=len(manifest['files']),sourceHead=git('rev-parse','HEAD'),verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),requiredChecks=required,runtimes=linux['runtimes'],fullLinuxResult='Node20 reporter:388 PASS;Node22/24 reporters:361 PASS each, all0 FAIL;eslint clean; 9 type tests/66 assertions; ATTW pack clean.',minimalRedGreen='Real Pino10.4 factory/default and custom errorKey, CLI: baseline 3 FAIL/2 PASS; candidate 5 PASS on Windows/Linux.',focusedRedGreen='Windows same dependencies: baseline4 FAIL/5 PASS; candidate9 PASS.',packageProof='Same tgz independently installed on Linux and Windows;78 shipped files match final source;factory/CLI/configured custom-error-key worker3 PASS each.',extraWindows=dict(fullCandidate=read('windows-full-ci-done.json'),fullBaseline=read('windows-baseline-full-ci-done.json'),limitation='Both full Windows npm run ci attempts remained in cli-rc.test.js after29 passed files and were terminated. Neither is a full Windows pass. Same first nodeID standalone passes on baseline and candidate; full-run cause is not established. Windows scoped regressions, real factory/CLI, installed worker, and types are green.'),optionalBenchmark=[s for s in extra if 'benchmark' in s['name']],qualification=dict(openPRCount=13,policy=meta['pull_request_creation_policy'],head=fresh['defaultBranchRef']['target']['oid'],issueUpdatedAt=fresh['issue']['updatedAt']),supersededAttempts=['Windows first npm pino@^10 caret was consumed by cmd; repaired direct node npm-cli argv installed10.4.0, all counted proofs use10.4.0.','Linux pack metadata parser initially read npm warning as JSON; real pack succeeded; parsing repaired without changing tgz or repeating benchmark.','First installed worker probe used directory import, then an incomplete await-close report, then omitted worker-specific errorLikeObjectKeys. These harness attempts are retained; final explicit fault option produced3 PASS. Automatic errorKey propagation is separately covered by direct pinoPretty stream regression, not asserted for manual worker transports.'])
(out/'FINAL-RECEIPT.json').write_text(json.dumps(receipt,indent=2),encoding='utf8')
print(json.dumps(dict(tree=receipt['tree'],sourceFiles=receipt['sourceFiles'],required=len(required),package='Linux/Windows3PASS each',extraWindows='full runs incomplete, retained controls')))

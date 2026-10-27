import sys,json,datetime
from pathlib import Path
sys.path.insert(0,'F:/Github-PR/ci-evidence')
from sol_high_serial_gh import gh
out=Path(__file__).parent
q='''query {
 repository(owner:"pinojs",name:"pino-pretty") {
  nameWithOwner isArchived stargazerCount
  defaultBranchRef { name target { oid } }
  issue(number:211) {
   number title body state createdAt updatedAt
   assignees(first:100){nodes{login}}
   comments(first:100){pageInfo{hasNextPage}nodes{body author{login}createdAt updatedAt}}
   timelineItems(first:100){pageInfo{hasNextPage}nodes{
    __typename ... on CrossReferencedEvent{source{__typename ...on PullRequest{number title state url}}}
   }}
  }
  prs:pullRequests(states:OPEN,first:100){totalCount pageInfo{hasNextPage}nodes{
   number title body headRefOid updatedAt author{login}
   files(first:100){pageInfo{hasNextPage}nodes{path}}
  }}
 }
 org:repository(owner:"pinojs",name:".github"){
  a:object(expression:"HEAD:CONTRIBUTING.md"){...on Blob{text}}
  b:object(expression:"HEAD:.github/CONTRIBUTING.md"){...on Blob{text}}
  ai:object(expression:"HEAD:AI_POLICY.md"){...on Blob{text}}
 }
}'''
d=gh('api','graphql','-f','query='+q)
d['verifiedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
(out/'fresh-qualification.json').write_text(json.dumps(d,indent=2),encoding='utf8')
r=d['data']['repository']
assert not r['prs']['pageInfo']['hasNextPage']
assert not r['issue']['comments']['pageInfo']['hasNextPage']
assert not r['issue']['timelineItems']['pageInfo']['hasNextPage']
summaries=[]
for pr in r['prs']['nodes']:
    assert not pr['files']['pageInfo']['hasNextPage']
    files=gh('api',f"repos/pinojs/pino-pretty/pulls/{pr['number']}/files?per_page=100")
    assert len(files)==len(pr['files']['nodes'])
    (out/f"fresh-pr{pr['number']}-files.json").write_text(json.dumps(files,indent=2),encoding='utf8')
    summaries.append(dict(number=pr['number'],title=pr['title'],head=pr['headRefOid'],paths=[f['filename'] for f in files]))
(out/'fresh-open-pr-index.json').write_text(json.dumps(summaries,indent=2),encoding='utf8')
print(json.dumps(dict(head=r['defaultBranchRef'],open=len(summaries),issue=r['issue']['state'],claims=r['issue']['assignees'],verifiedAt=d['verifiedAt'])))

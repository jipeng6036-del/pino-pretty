import pathlib,subprocess,json,hashlib,time
r=pathlib.Path(__file__).parent;repo=pathlib.Path('F:/Github-PR/inspection/discovery-20261027-js-pino-pretty');target=repo/'lib/pretty.js';candidate=target.read_bytes();base=subprocess.check_output(['git','show','10aba398031e27455ece28398b13e92678f6c249:lib/pretty.js'],cwd=repo);records=[]
try:
 for name,code in [('baseline',base),('candidate',candidate)]:
  target.write_bytes(code);start=time.time()
  with (r/('windows-focused-'+name+'.log')).open('wb') as out:p=subprocess.run(['node','--test','--test-name-pattern=hideObject','test/error-objects.test.js'],cwd=repo,stdout=out,stderr=subprocess.STDOUT)
  records.append({'kind':name,'command':'node --test --test-name-pattern=hideObject test/error-objects.test.js','code':p.returncode,'sourceSha256':hashlib.sha256(code).hexdigest(),'testSha256':hashlib.sha256((repo/'test/error-objects.test.js').read_bytes()).hexdigest(),'seconds':round(time.time()-start,2)});(r/'windows-focused-summary.json').write_text(json.dumps(records,indent=2),encoding='utf8');print(records[-1],flush=True)
finally:target.write_bytes(candidate)
assert records[0]['code']==1 and records[1]['code']==0
assert target.read_bytes()==candidate

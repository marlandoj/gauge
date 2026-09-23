import json, pathlib, re, math, collections, hashlib, time, argparse
parser=argparse.ArgumentParser(description='Development-only grouped TF-IDF comparison')
parser.add_argument('--output-dir', required=True, type=pathlib.Path)
args=parser.parse_args()
ROOT=pathlib.Path(__file__).resolve().parents[2]; OUT=args.output_dir.resolve(); OUT.mkdir(parents=True, exist_ok=True)
TIERS=['trivial','simple','moderate','complex','apex']
CASES=[]
for name in ['development.jsonl','development-reviewed.json','v2/cohort.json']:
 p=ROOT/name
 d=[json.loads(s) for s in p.read_text().splitlines()] if name.endswith('.jsonl') else json.loads(p.read_text())
 if isinstance(d,dict):d=d['cases']
 for c in d: CASES.append(dict(id=c['id'],group=c['group_id'],text=c['task_text'],tier=c['tier'],cohort=name))
(OUT/'cases.json').write_text(json.dumps(CASES,indent=2))
STOP=set('a an the of and or to for in on at is are be as by with from that this it its our your we you us all any'.split())
def feats(s,mode):
 s=re.sub(r'```[\s\S]*?```',' ',s).lower()
 words=re.findall(r"[a-z]+(?:'[a-z]+)?",s)
 w=[x for x in words if x not in STOP]
 f=collections.Counter('w:'+x for x in w)
 if mode in ['wordbigram','mixed']:
  f.update('b:'+a+'_'+b for a,b in zip(words,words[1:]))
 if mode=='mixed':
  for word in w:
   token='^'+word+'$'
   for n in [3,4]:
    f.update('c:'+token[i:i+n] for i in range(len(token)-n+1))
 return f
FEATURES={m:[feats(c['text'],m) for c in CASES] for m in ['word','wordbigram','mixed']}
def norm(d):
 n=math.sqrt(sum(v*v for v in d.values()))
 return {k:v/n for k,v in d.items()} if n else d
def dot(a,b):
 if len(a)>len(b):a,b=b,a
 return sum(v*b.get(k,0) for k,v in a.items())
def run_fold(train,test,mode):
 F=FEATURES[mode]; df=collections.Counter(k for i in train for k in F[i]);n=len(train)
 idf={k:math.log((1+n)/(1+v))+1 for k,v in df.items()}
 def vec(i):return norm({k:(1+math.log(v))*idf[k] for k,v in F[i].items() if k in idf})
 vectors={i:vec(i) for i in train}
 centroids=[]
 for tier in TIERS:
  c=collections.Counter()
  for i in train:
   if CASES[i]['tier']==tier:c.update(vectors[i])
  centroids.append(norm(c))
 preds={m:[] for m in ['knn1','knn3','knn5','centroid']}
 for j in test:
  v=vec(j); ranked=sorted(((dot(v,vectors[i]),i) for i in train),key=lambda p:(-p[0],p[1]))
  for k in [1,3,5]:
   votes=[sum(sim for sim,i in ranked[:k] if CASES[i]['tier']==t) for t in TIERS]
   pred=max(range(5),key=lambda z:votes[z]);preds['knn'+str(k)].append((j,TIERS[pred]))
  preds['centroid'].append((j,TIERS[max(range(5),key=lambda z:dot(v,centroids[z]))]))
 return preds

def metrics(preds,cohort=None):
 ids=[i for i in range(len(CASES)) if cohort is None or CASES[i]['cohort']==cohort]
 conf=[[0]*6 for _ in TIERS]; exact=under=severe=up=down=esc=abstain=0; groups=collections.defaultdict(list)
 for i in ids:
  y=TIERS.index(CASES[i]['tier']); p=TIERS.index(preds[i]) if preds[i] in TIERS else 5
  conf[y][p]+=1;exact+=p==y;groups[CASES[i]['group']].append((y,p))
  if p==5:abstain+=1;continue
  under+=y>=3 and p<y;severe+=abs(p-y)>=2;up+=p-y>=2;down+=y-p>=2;esc+=p>y
 high=sum(TIERS.index(CASES[i]['tier'])>=3 for i in ids)
 return dict(n=len(ids),exact=exact,accuracy=round(exact/len(ids),4),group_n=len(groups),group_exact=sum(all(y==p for y,p in v) for v in groups.values()),group_high_under=sum(any(y>=3 and p<y for y,p in v) for v in groups.values()),group_severe=sum(any(p<5 and abs(p-y)>=2 for y,p in v) for v in groups.values()),high_n=high,high_under=under,escalations=esc,severe=severe,severe_up=up,severe_down=down,abstentions=abstain,confusion=conf,recall=[round(conf[i][i]/sum(conf[i]),4) if sum(conf[i]) else None for i in range(5)])

def main():
 start=time.monotonic();predictions={}
 splits={
 'leave_group_out':[[i for i,c in enumerate(CASES) if c['group']==g] for g in sorted(set(c['group'] for c in CASES))],
 'leave_cohort_out':[[i for i,c in enumerate(CASES) if c['cohort']==g] for g in sorted(set(c['cohort'] for c in CASES))]
 }
 for split,folds in splits.items():
  for mode in FEATURES:
   result={m:{} for m in ['knn1','knn3','knn5','centroid']}
   for test in folds:
    heldgroups={CASES[i]['group'] for i in test}
    train=[i for i,c in enumerate(CASES) if c['group'] not in heldgroups]
    for m,ps in run_fold(train,test,mode).items():result[m].update(ps)
   for m,ps in result.items():predictions[split+'/'+mode+'/'+m]=[ps[i] for i in range(len(CASES))]
 baseline=json.loads((pathlib.Path(__file__).parent/'baseline.json').read_text());predictions['current_v2']=[x['tier'] for x in baseline]
 report={name:{cohort:metrics(preds,None if cohort=='all' else cohort) for cohort in ['all','development.jsonl','development-reviewed.json','v2/cohort.json']} for name,preds in predictions.items()}
 (OUT/'predictions.json').write_text(json.dumps(predictions,indent=2));(OUT/'results.json').write_text(json.dumps(report,indent=2))
 print('elapsed',time.monotonic()-start)
 for split in splits:
  for name,m in sorted(report.items(),key=lambda kv:-kv[1]['all']['accuracy']):
   if name.startswith(split):print(name, {k:m['all'][k] for k in ['exact','group_exact','high_under','severe']},'cohort exact',[m[c]['exact'] for c in ['development.jsonl','development-reviewed.json','v2/cohort.json']])
 print('BASELINE',report['current_v2'])
if __name__=='__main__':main()

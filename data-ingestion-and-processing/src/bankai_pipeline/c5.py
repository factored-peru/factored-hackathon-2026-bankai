"""C5 offline ordinal satisfaction baseline on canonically joined interactions."""
from __future__ import annotations
import hashlib,json,tempfile,tomllib
from dataclasses import asdict,dataclass
from datetime import datetime
from pathlib import Path
from typing import Any,Protocol
import pandas as pd
from bankai_pipeline.classification import CategoricalNaiveBayes,categorical_item
FEATURES=("interaction_type","channel");TARGET="main_score";COLUMNS=("interaction_date",*FEATURES,TARGET)
@dataclass(frozen=True)
class Split:name:str;start:datetime;end:datetime;size:int
@dataclass(frozen=True)
class Config:project:str;dataset:str;output_dir:Path;maximum_bytes_billed:int;alpha:float;train:Split;calibration:Split;test:Split
class Client(Protocol):
 def get_table(self,table:str)->Any: ...
 def query(self,query:str,job_config:Any)->Any: ...
def load_config(p):
 d=tomllib.loads(p.read_text());s=d["c5"]
 def sp(n):x=s[n];return Split(n,_time(x["start_timestamp"]),_time(x["end_timestamp"]),int(x["sample_size"]))
 return Config(s["project"],s["dataset"],Path(s["output_dir"]),int(s["maximum_bytes_billed"]),float(s.get("alpha",1)),sp("train"),sp("calibration"),sp("test"))
def dry_run_plan(c):return {"case":"C5","target":TARGET,"ordinal_scale":[1,2,3,4,5,6,7],"features":[*FEATURES,"interaction_month","interaction_weekday"],"join":"interaction_id exact","excluded":["interaction_id","customer_id","agent_id","contact_reason","duration_seconds","wait_time_seconds","detected_sentiment","sentiment_score","question_1_text","question_2_text","question_3_text","open_comments","nps_category"],"splits":[_split(x) for x in (c.train,c.calibration,c.test)],"publication":"not_requested"}
def run(c,run_id,client):
 _schema(client,c);frames={};lineage=[]
 for sp in (c.train,c.calibration,c.test):
  f,l=_read(client,c,sp)
  if len(f)!=sp.size:raise ValueError("incomplete C5 sample")
  if not f[TARGET].between(1,7).all():raise ValueError("C5 main_score must be 1..7")
  frames[sp.name]=f;lineage.append(l)
 records={n:_records(f) for n,f in frames.items()};labels={n:frames[n][TARGET].astype(int).tolist() for n in frames};model=CategoricalNaiveBayes(c.alpha).fit(records["train"],labels["train"])
 metrics={n:_metrics(model,records[n],labels[n]) for n in ("calibration","test")}
 m={"schema_version":"bankai-c5-satisfaction-v1","run_id":run_id,"case":"C5","config_hash":_hash(asdict(c)),"lineage":lineage,"feature_contract":{"features":dry_run_plan(c)["features"],"ordinal_scale":[1,2,3,4,5,6,7],"excluded":dry_run_plan(c)["excluded"]},"metrics":metrics,"publication":"not_requested"};_write(c.output_dir/run_id,"c5-manifest.json",m);_write(c.output_dir/run_id,"c5-model.json",model.payload());return m
def _schema(client,c):
 t={x.name for x in client.get_table(f"{c.project}.{c.dataset}.call_center_interactions").schema};s={x.name for x in client.get_table(f"{c.project}.{c.dataset}.satisfaction_surveys").schema}
 if {"interaction_id","interaction_date","reason_category",*FEATURES}-t or {"interaction_id",TARGET}-s:raise ValueError("C5 schema missing required fields")
def _read(client,c,sp):
 from google.cloud import bigquery
 cols=", ".join(f"`{x}`" for x in COLUMNS);q=f"""WITH s AS (SELECT i.`interaction_date`, i.`interaction_type`, i.`channel`, s.`main_score` FROM `{c.project}.{c.dataset}.call_center_interactions` i JOIN `{c.project}.{c.dataset}.satisfaction_surveys` s USING (`interaction_id`) WHERE i.`reason_category`='Transaccional' AND i.`interaction_date`>=@start AND i.`interaction_date`<@end AND s.`main_score` IS NOT NULL ORDER BY FARM_FINGERPRINT(CAST(i.`interaction_id` AS STRING)) LIMIT @size) SELECT {cols} FROM s""";p=[bigquery.ScalarQueryParameter("start","TIMESTAMP",sp.start),bigquery.ScalarQueryParameter("end","TIMESTAMP",sp.end),bigquery.ScalarQueryParameter("size","INT64",sp.size)];j=client.query(q,job_config=bigquery.QueryJobConfig(query_parameters=p,maximum_bytes_billed=c.maximum_bytes_billed,use_query_cache=False,labels={"component":"c5","operation":f"c5-{sp.name}"}));f=pd.DataFrame([dict(x) for x in j.result()],columns=COLUMNS);return f,{"split":sp.name,"tables":[f"{c.dataset}.call_center_interactions",f"{c.dataset}.satisfaction_surveys"],"query_hash":hashlib.sha256(q.encode()).hexdigest(),"job_id":j.job_id,"total_bytes_processed":int(j.total_bytes_processed or 0),"row_count":len(f)}
def _records(f):
 o=[]
 for _,r in f.iterrows():
  x={z:categorical_item(r[z]) for z in FEATURES};t=pd.Timestamp(r.interaction_date);x["interaction_month"]=f"M{t.month:02d}";x["interaction_weekday"]=f"D{t.weekday()}";o.append(x)
 return o
def _metrics(model,records,labels):
 from sklearn.metrics import cohen_kappa_score,f1_score,mean_absolute_error
 probs=[model.probabilities(x) for x in records];expected=[sum(int(k)*v for k,v in p.items()) for p in probs];pred=[max(p,key=p.get) for p in probs]
 return {"row_count":len(labels),"mae_expected_score":round(float(mean_absolute_error(labels,expected)),6),"macro_f1":round(float(f1_score(labels,pred,average="macro",labels=[1,2,3,4,5,6,7],zero_division=0)),6),"quadratic_weighted_kappa":round(float(cohen_kappa_score(labels,pred,weights="quadratic")),6),"class_support":{str(x):labels.count(x) for x in range(1,8)},"decision_threshold":"not_applicable"}
def _write(root,name,p):
 root.mkdir(parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile("w",dir=root,delete=False,encoding="utf-8") as f:json.dump(p,f,indent=2,sort_keys=True);f.write("\n");tmp=Path(f.name)
 tmp.replace(root/name)
def _time(x):return datetime.fromisoformat(x.replace("Z","+00:00"))
def _split(x):return {"name":x.name,"start":x.start.isoformat(),"end":x.end.isoformat(),"sample_size":x.size}
def _hash(x):return hashlib.sha256(json.dumps(x,default=str,sort_keys=True).encode()).hexdigest()

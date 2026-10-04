"""C4 offline dual-risk baseline for transaction-support interactions."""
from __future__ import annotations
import hashlib,json,tempfile,tomllib
from dataclasses import asdict,dataclass
from datetime import datetime
from pathlib import Path
from typing import Any,Protocol
import pandas as pd
from bankai_pipeline.classification import CategoricalNaiveBayes,apply_platt,binary_metrics,categorical_item,fit_platt
TARGETS=("requires_followup","was_escalated"); FEATURES=("interaction_type","channel"); COLUMNS=("interaction_date",*FEATURES,*TARGETS); TABLE="call_center_interactions"
@dataclass(frozen=True)
class Split: name:str; start:datetime; end:datetime; size:int
@dataclass(frozen=True)
class Config: project:str;dataset:str;output_dir:Path;maximum_bytes_billed:int;alpha:float;train:Split;calibration:Split;test:Split
class Client(Protocol):
 def get_table(self,table:str)->Any: ...
 def query(self,query:str,job_config:Any)->Any: ...
def load_config(p:Path)->Config:
 d=tomllib.loads(p.read_text());s=d["c4"]
 def sp(n): x=s[n];return Split(n,_time(x["start_timestamp"]),_time(x["end_timestamp"]),int(x["sample_size"]))
 return Config(s["project"],s["dataset"],Path(s["output_dir"]),int(s["maximum_bytes_billed"]),float(s.get("alpha",1)),sp("train"),sp("calibration"),sp("test"))
def dry_run_plan(c): return {"case":"C4","targets":list(TARGETS),"features":[*FEATURES,"interaction_month","interaction_weekday"],"excluded":["interaction_id","customer_id","agent_id","contact_reason","duration_seconds","wait_time_seconds","detected_sentiment","sentiment_score","transcript","recording"],"splits":[_split(x) for x in (c.train,c.calibration,c.test)],"publication":"not_requested"}
def run(c,run_id,client):
 _schema(client,c); frames={}; lineage=[]
 for sp in (c.train,c.calibration,c.test):
  f,l=_read(client,c,sp);frames[sp.name]=f;lineage.append(l)
  if len(f)!=sp.size:raise ValueError("incomplete C4 sample")
 rec={n:_records(f) for n,f in frames.items()}; results={}; models={}
 for target in TARGETS:
  labels={n:frames[n][target].astype(bool).tolist() for n in frames}; model=CategoricalNaiveBayes(c.alpha).fit(rec["train"],labels["train"])
  coef,inter=fit_platt([model.probabilities(x)[True] for x in rec["calibration"]],labels["calibration"])
  prob=[apply_platt(model.probabilities(x)[True],coef,inter) for x in rec["test"]]
  results[target]={"calibration":binary_metrics([apply_platt(model.probabilities(x)[True],coef,inter) for x in rec["calibration"]],labels["calibration"]),"test":binary_metrics(prob,labels["test"])};models[target]={**model.payload(),"calibrator":{"coefficient":coef,"intercept":inter}}
 m={"schema_version":"bankai-c4-interaction-risk-v1","run_id":run_id,"case":"C4","config_hash":_hash(asdict(c)),"lineage":lineage,"feature_contract":{"features":dry_run_plan(c)["features"],"excluded":dry_run_plan(c)["excluded"]},"metrics":results,"publication":"not_requested"};_write(c.output_dir/run_id,"c4-manifest.json",m);_write(c.output_dir/run_id,"c4-models.json",models);return m
def _schema(client,c):
 s={x.name for x in client.get_table(f"{c.project}.{c.dataset}.{TABLE}").schema};req={"interaction_id","interaction_date","reason_category",*FEATURES,*TARGETS}
 if req-s:raise ValueError(f"C4 schema missing {sorted(req-s)}")
def _read(client,c,sp):
 from google.cloud import bigquery
 table=f"{c.project}.{c.dataset}.{TABLE}";cols=", ".join(f"`{x}`" for x in COLUMNS);q=f"WITH s AS (SELECT {cols} FROM `{table}` WHERE `reason_category`='Transaccional' AND `interaction_date`>=@start AND `interaction_date`<@end ORDER BY FARM_FINGERPRINT(CAST(`interaction_id` AS STRING)) LIMIT @size) SELECT {cols} FROM s";p=[bigquery.ScalarQueryParameter("start","TIMESTAMP",sp.start),bigquery.ScalarQueryParameter("end","TIMESTAMP",sp.end),bigquery.ScalarQueryParameter("size","INT64",sp.size)];j=client.query(q,job_config=bigquery.QueryJobConfig(query_parameters=p,maximum_bytes_billed=c.maximum_bytes_billed,use_query_cache=False,labels={"component":"c4","operation":f"c4-{sp.name}"}));f=pd.DataFrame([dict(x) for x in j.result()],columns=COLUMNS);return f,{"split":sp.name,"table":f"{c.dataset}.{TABLE}","query_hash":hashlib.sha256(q.encode()).hexdigest(),"job_id":j.job_id,"total_bytes_processed":int(j.total_bytes_processed or 0),"row_count":len(f)}
def _records(f):
 o=[]
 for _,r in f.iterrows():
  x={a:categorical_item(r[a]) for a in FEATURES};t=pd.Timestamp(r.interaction_date);x["interaction_month"]=f"M{t.month:02d}";x["interaction_weekday"]=f"D{t.weekday()}";o.append(x)
 return o
def _write(root,name,p):
 root.mkdir(parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile("w",dir=root,delete=False,encoding="utf-8") as f:json.dump(p,f,indent=2,sort_keys=True);f.write("\n");tmp=Path(f.name)
 tmp.replace(root/name)
def _time(x):return datetime.fromisoformat(x.replace("Z","+00:00"))
def _split(x):return {"name":x.name,"start":x.start.isoformat(),"end":x.end.isoformat(),"sample_size":x.size}
def _hash(x):return hashlib.sha256(json.dumps(x,default=str,sort_keys=True).encode()).hexdigest()

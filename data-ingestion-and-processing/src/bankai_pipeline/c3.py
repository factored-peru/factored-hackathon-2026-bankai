"""C3 fraud investigation baseline; bounded, weighted and offline only."""
from __future__ import annotations
import hashlib, json, tempfile, tomllib
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Protocol
import pandas as pd
from bankai_pipeline.classification import CategoricalNaiveBayes, apply_platt, binary_metrics, categorical_item, fit_platt

FEATURES=("transaction_type","transaction_category","currency","channel","merchant_category","transaction_status","response_code")
COLUMNS=("transaction_date",*FEATURES,"amount","fraud_score","is_fraud")
TARGET="is_fraud"; TABLE="transactions"
@dataclass(frozen=True)
class Split: name:str; start:datetime; end:datetime; positive:int; negative:int
@dataclass(frozen=True)
class Config: project:str; dataset:str; output_dir:Path; maximum_bytes_billed:int; alpha:float; train:Split; calibration:Split; test:Split
class Client(Protocol):
 def get_table(self,table:str)->Any: ...
 def query(self,query:str,job_config:Any)->Any: ...

def load_config(path:Path)->Config:
 data=tomllib.loads(path.read_text()); s=data["c3"]
 def split(name):
  x=s[name]; return Split(name,_time(x["start_timestamp"]),_time(x["end_timestamp"]),int(x["positive_rows"]),int(x["negative_rows"]))
 c=Config(s["project"],s["dataset"],Path(s["output_dir"]),int(s["maximum_bytes_billed"]),float(s.get("alpha",1)),split("train"),split("calibration"),split("test"))
 if any(x.end<=x.start or x.positive<=0 or x.negative<=0 for x in (c.train,c.calibration,c.test)): raise ValueError("invalid C3 splits")
 return c
def dry_run_plan(c:Config)->dict[str,object]:
 return {"case":"C3","target":TARGET,"features":[*FEATURES,"amount_bucket","transaction_month","transaction_weekday"],"excluded":["transaction_id","customer_id","merchant_name","transaction_country","transaction_city","latitude","longitude","fraud_score"],"sampling":"stratified_weighted","splits":[_split(x) for x in (c.train,c.calibration,c.test)],"comparison":"platt_calibrated_fraud_score","publication":"not_requested"}

def run(c:Config,run_id:str,client:Client)->dict[str,object]:
 _schema(client,c); frames={}; lineage=[]
 for split in (c.train,c.calibration,c.test):
  frame,source=_read(client,c,split)
  if len(frame)!=split.positive+split.negative: raise ValueError("incomplete C3 sample")
  frames[split.name]=frame; lineage.append(source)
 bounds=_bounds(frames["train"].amount)
 records={name:_records(frame,bounds) for name,frame in frames.items()}
 labels={name:frames[name][TARGET].astype(bool).tolist() for name in frames}
 population={name:lineage[index]["population_counts"] for index,name in enumerate(("train","calibration","test"))}
 model=CategoricalNaiveBayes(c.alpha).fit(records["train"],labels["train"],population_counts={False:population["train"]["false"],True:population["train"]["true"]})
 weights={name:_weights(labels[name],population[name]) for name in labels}
 raw={name:[model.probabilities(row)[True] for row in records[name]] for name in records}
 coef,intercept=fit_platt(raw["calibration"],labels["calibration"],weights["calibration"])
 probabilities=[apply_platt(value,coef,intercept) for value in raw["test"]]
 fraud_score=_score_comparison(frames,labels,weights)
 manifest={"schema_version":"bankai-c3-fraud-v1","run_id":run_id,"case":"C3","config_hash":_hash(asdict(c)),"lineage":lineage,"target":TARGET,"feature_contract":{"features":dry_run_plan(c)["features"],"excluded":dry_run_plan(c)["excluded"],"amount_bounds":bounds},"training":{"algorithm":"categorical_naive_bayes_laplace","alpha":c.alpha,"calibration":"weighted_platt"},"metrics":{"model":binary_metrics(probabilities,labels["test"],weights["test"]),"fraud_score":fraud_score},"publication":"not_requested"}
 _write(c.output_dir/run_id,"c3-manifest.json",manifest); _write(c.output_dir/run_id,"c3-model.json",{**model.payload(),"calibrator":{"coefficient":coef,"intercept":intercept}}); return manifest

def _schema(client,c):
 types={x.name:x.field_type.upper() for x in client.get_table(f"{c.project}.{c.dataset}.{TABLE}").schema}; required={"transaction_id","transaction_date",*FEATURES,"amount","fraud_score",TARGET}
 if required-set(types): raise ValueError(f"C3 schema missing {sorted(required-set(types))}")
def _read(client,c,split):
 from google.cloud import bigquery
 table=f"{c.project}.{c.dataset}.{TABLE}"; cols=", ".join(f"`{x}`" for x in COLUMNS)
 count=f"SELECT `{TARGET}` label, COUNT(*) row_count FROM `{table}` WHERE `transaction_date`>=@start AND `transaction_date`<@end GROUP BY label"
 base=[bigquery.ScalarQueryParameter("start","TIMESTAMP",split.start),bigquery.ScalarQueryParameter("end","TIMESTAMP",split.end)]
 counts={bool(x["label"]):int(x["row_count"]) for x in client.query(count,job_config=_job(c,base,"c3-count")).result()}
 query=f"""WITH e AS (SELECT {cols}, ROW_NUMBER() OVER (PARTITION BY `{TARGET}` ORDER BY FARM_FINGERPRINT(CAST(`transaction_id` AS STRING))) n FROM `{table}` WHERE `transaction_date`>=@start AND `transaction_date`<@end) SELECT {cols} FROM e WHERE (`{TARGET}` AND n<=@positive) OR (NOT `{TARGET}` AND n<=@negative)"""
 parameters=[*base,bigquery.ScalarQueryParameter("positive","INT64",split.positive),bigquery.ScalarQueryParameter("negative","INT64",split.negative)]
 job=client.query(query,job_config=_job(c,parameters,f"c3-{split.name}")); frame=pd.DataFrame([dict(x) for x in job.result()],columns=COLUMNS)
 return frame,{"split":split.name,"table":f"{c.dataset}.{TABLE}","query_hash":hashlib.sha256(query.encode()).hexdigest(),"job_id":job.job_id,"total_bytes_processed":int(job.total_bytes_processed or 0),"row_count":len(frame),"population_counts":{"false":counts.get(False,0),"true":counts.get(True,0)}}
def _records(frame,bounds):
 out=[]
 for _,r in frame.iterrows():
  x={f:categorical_item(r[f]) for f in FEATURES}; amount=pd.to_numeric(pd.Series([r.amount]),errors="coerce").iloc[0]; x["amount_bucket"]="MISSING" if pd.isna(amount) else ("LOW" if abs(amount)<=bounds[0] else "MEDIUM" if abs(amount)<=bounds[1] else "HIGH")
  t=pd.Timestamp(r.transaction_date); x["transaction_month"]=f"M{t.month:02d}"; x["transaction_weekday"]=f"D{t.weekday()}"; out.append(x)
 return out
def _bounds(v):
 x=pd.to_numeric(v,errors="coerce").dropna().abs(); return [float(x.quantile(q)) for q in (.5,.9)]
def _weights(labels,counts): return [counts["true"] / sum(labels) if label else counts["false"] / (len(labels)-sum(labels)) for label in labels]
def _score_comparison(frames,labels,weights):
 cal=frames["calibration"]; test=frames["test"]; ci=cal.fraud_score.notna(); ti=test.fraud_score.notna()
 if not ci.any() or not ti.any(): return {"status":"unavailable"}
 raw=[min(max(float(v)/100,1e-6),1-1e-6) for v in cal.loc[ci,"fraud_score"]]; coef,inter=fit_platt(raw,[x for x,m in zip(labels["calibration"],ci,strict=True) if m],[x for x,m in zip(weights["calibration"],ci,strict=True) if m])
 p=[apply_platt(min(max(float(v)/100,1e-6),1-1e-6),coef,inter) for v in test.loc[ti,"fraud_score"]]
 return {"status":"comparable_non_null_fraud_score","non_null_test_rows":len(p),**binary_metrics(p,[x for x,m in zip(labels["test"],ti,strict=True) if m],[x for x,m in zip(weights["test"],ti,strict=True) if m])}
def _job(c,p,label):
 from google.cloud import bigquery
 return bigquery.QueryJobConfig(query_parameters=p,maximum_bytes_billed=c.maximum_bytes_billed,use_query_cache=False,labels={"component":"c3","operation":label})
def _write(root,name,payload):
 root.mkdir(parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile("w",dir=root,delete=False,encoding="utf-8") as f: json.dump(payload,f,sort_keys=True,indent=2); f.write("\n"); tmp=Path(f.name)
 tmp.replace(root/name)
def _time(x): return datetime.fromisoformat(x.replace("Z","+00:00"))
def _split(x): return {"name":x.name,"start":x.start.isoformat(),"end":x.end.isoformat(),"positive_rows":x.positive,"negative_rows":x.negative}
def _hash(x): return hashlib.sha256(json.dumps(x,default=str,sort_keys=True).encode()).hexdigest()

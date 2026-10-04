"""Validate and consolidate sanitized C1--C5 experiment manifests."""
from __future__ import annotations
import hashlib,json,tempfile
from pathlib import Path

CASES={"C1":"c1-manifest.json","C2":"c2-manifest.json","C3":"c3-manifest.json","C4":"c4-manifest.json","C5":"c5-manifest.json"}
def build(case_dirs:dict[str,Path],output:Path,run_id:str)->dict[str,object]:
 manifests={}
 for case,name in CASES.items():
  path=case_dirs[case]/name
  if not path.is_file():raise ValueError(f"missing {case} manifest")
  payload=json.loads(path.read_text())
  if payload.get("case")!=case or payload.get("publication")!="not_requested":raise ValueError(f"invalid {case} manifest")
  manifests[case]={"sha256":hashlib.sha256(path.read_bytes()).hexdigest(),"schema_version":payload.get("schema_version"),"run_id":payload.get("run_id"),"publication":payload.get("publication")}
 destination=output/run_id;destination.mkdir(parents=True,exist_ok=True)
 report={"schema_version":"bankai-supervised-suite-v1","run_id":run_id,"cases":manifests,"blocked_cases":{"C6":"missing complaint-to-transaction canonical relation","C7":"missing merchant evidence and validated outcome","C8":"missing payment-rail reconciliation evidence"},"publication":"not_requested"}
 with tempfile.NamedTemporaryFile("w",dir=destination,delete=False,encoding="utf-8") as f:json.dump(report,f,indent=2,sort_keys=True);f.write("\n");tmp=Path(f.name)
 tmp.replace(destination/"supervised-suite-manifest.json");return report

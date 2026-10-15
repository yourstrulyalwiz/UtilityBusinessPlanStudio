"""Reconcile the supplied workbooks; retain unknown values rather than inventing them."""
import json,zipfile,xml.etree.ElementTree as E
from pathlib import Path
n={"s":"http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
def sheet(file,index):
 with zipfile.ZipFile(file) as z:
  ss=["".join(s.itertext()) for s in E.fromstring(z.read("xl/sharedStrings.xml"))] if "xl/sharedStrings.xml" in z.namelist() else []
  out=[]
  for row in E.fromstring(z.read(f"xl/worksheets/sheet{index}.xml")).findall(".//s:row",n):
   d={"_row":int(row.get("r"))}
   for c in row:
    v=c.find("s:v",n);i=c.find("s:is",n)
    t=(v.text or "") if v is not None else "".join(i.itertext()) if i is not None else ""
    d["".join(filter(str.isalpha,c.get("r")))]=ss[int(t)] if c.get("t")=="s" else t
   out.append(d)
  return out
for name,old,new in [
 ("strategy","1792028390932","1792030506255"),
 ("assessment","1792029251158","1792030506254")]:
 code=Path(f"scripts/extract-{name}.py").read_text().replace(old,new)
 exec(compile(code,f"extract-{name}","exec"))
root=Path("artifacts/api-server/src/lib")
data=json.loads((root/"tagbilaran-option-b.json").read_text())
review="attached_assets/TCWS_Data_Review_1792030506255.xlsx"
def num(t):
 try:return float(t)
 except:return None
history=[dict(metric=r.get("B",""),unit=r.get("C",""),year=int(r["D"]),value=num(r.get("E","")),note=r.get("G","")) for r in sheet(review,1)[1:] if r.get("D","").isdigit()]
for h in history:
 if h["unit"]=="%" and h["value"] is not None:h["value"]*=100
 if h["year"]==2025 and any(w in h["metric"].lower() for w in ["volume","production","nrw","collections"]):
  h["year"]="2025 Jan–Jul" if "collections" in h["metric"].lower() else "2025 Jan–Jun"
 if h["year"]==2014 and "collections" in h["metric"].lower():h["year"]="2014 Feb–Dec"
 if "spot check" in h["metric"].lower():h["year"]=str(h["year"])+" December spot check"
variables=sheet("attached_assets/TCWS_Indicators_2024_1792030506255.xlsx",2)
mapping={6:6,7:7,8:8,10:10,11:11,12:12,13:13,14:14,15:15,16:16,17:17,18:18,19:19,20:20,22:22,23:23,24:24,25:25,26:26,27:27,28:28,29:29,31:31,32:32,33:33,35:35,36:36,38:37,39:38,40:39,41:40,42:41,43:42,44:43,46:48,47:49,48:54}
original=json.loads(Path("lib/baseline/src/workbook.json").read_text())
values={v["id"]:None for v in original["variables"] if not v.get("excelFormula")}
notes={}
for row,old in mapping.items():
 r=next(r for r in variables if r["_row"]==row);key=f"v{old}"
 values[key]=num(r.get("C",""))
 notes[key]=("Period: "+r["D"]+". " if r.get("D") else "")+r.get("F","")
# Billings are absent: do not produce a fabricated 100% collection ratio.
values["v36"]=None
notes["v36"]="Collection efficiency is unavailable: annual billings are not recorded. Collections are included in the historical series."
data["module1"]={"baselineVersion":1,"referenceYear":2024,"variables":values,"variableNotes":notes,"indicatorNotes":{},"importedWorkbook":True,"history":history}
data["module2"]=json.loads((root/"strategy-tcws.json").read_text())
data["module3"]=json.loads((root/"assessment-tcws.json").read_text())
data["module3"]["review_notes"]="Validated annual NRW is 39.9% in 2024; the 31.3% H1 2025 estimate is provisional. Financial indicators use matched 2023 collections and OPEX as a cash-based proxy, not accrual revenue. Reconcile tariff volume denominators, OPEX versions and CAPEX totals before approval. Coverage uses 6,393 domestic connections and the 106,120 census population; older barangay breakdowns are not current."
data["module5"]["history"]=history
for k in data["module7"]["kpis"]:
 corrections={"nrw":((3049028-1833134)/3049028*100,"2024"),
  "water_coverage":(6393*4.5/106120*100,"2024; whole-city census denominator"),
  "water_availability":(23.87,"2024; connection-weighted"),
  "avg_consumption":(1833134/6461/12,"2024"),
  "avg_tariff":(None,"Unknown: collections per billed m³ are not the average billed tariff"),
  "staff_per_1000":(24/6461*1000,"2025 staffing / 2024 connections; includes job-order staff")}
 if k["code"] in corrections:k["baseline"],k["baseline_period"]=corrections[k["code"]]
for r in data["module5"]["actuals"]:
 r["period"]="Jan–Jul (partial year)" if r["year"]==2025 else "Full year"
data["module8"]["data_review"]=[dict(zip(["id","topic","previous","supporting","severity","action"],[r.get(c,"") for c in "ABCDEF"])) for r in sheet(review,3)[1:]]
data["module8"]["executive_summary"]="TCWS serves 6,461 connections at December 2024, falling to 6,314 in December 2025. Annual NRW improved from 46.3% in 2023 to 39.9% in 2024. The 2016 block tariff remains in place. Collections were PhP 22.89 million in 2024; billings are unavailable. Priorities are loss reduction, billing controls, staff capacity and financially sustainable expansion. The financial model proposes PhP 579.2 million CAPEX in 2026–2029 and PhP 114.1 million in 2035. These projections are preliminary: tariff denominators, OPEX assumptions and the difference from the PhP 255.4 million plan must be reconciled before investment or tariff decisions."
data["scenarios"]=[{"code":code,"name":name,"type":kind,"is_primary":kind=="base","description":desc} for code,name,kind,desc in [
 ("SC-CONS","Conservative","conservative","Downside planning case. Set and justify assumptions before using projections; no unsupported results are prefilled."),
 ("SC-BASE","Base","base","Supplied preliminary business plan, subject to the data-review findings. Not an approved financial forecast."),
 ("SC-AMB","Ambitious","ambitious","Upside planning case. Set and justify assumptions before using projections; no unsupported results are prefilled.")]]
(root/"tcws-reviewed.json").write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")

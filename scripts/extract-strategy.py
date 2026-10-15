"""Extract the supplied strategic framework without inferring missing cells."""
import json,zipfile,xml.etree.ElementTree as E
from pathlib import Path
n={"s":"http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
with zipfile.ZipFile("attached_assets/TCWS_Strategic_Framework_1792028390932.xlsx") as z:
    ss=["".join(s.itertext()) for s in E.fromstring(z.read("xl/sharedStrings.xml"))] if "xl/sharedStrings.xml" in z.namelist() else []
    def rows(sheet):
        result=[]
        for row in E.fromstring(z.read(f"xl/worksheets/sheet{sheet}.xml")).findall(".//s:row",n):
            cells={}
            for c in row:
                v=c.find("s:v",n); inline=c.find("s:is",n)
                t=(v.text or "") if v is not None else "".join(inline.itertext()) if inline is not None else ""
                if c.get("t")=="s":t=ss[int(t)]
                cells["".join(filter(str.isalpha,c.get("r")))]=t
            result.append(cells)
        return result[1:]
    r=rows(1)
    data={"strategyVersion":1,"vision":next(x["D"] for x in r if x["B"]=="Vision"),"mission":next(x["D"] for x in r if x["B"]=="Mission"),
          "values":[x["D"] for x in sorted(r,key=lambda x:int(x["C"])) if x["B"]=="Value"]}
    fields=["code","title","relevant","specific","kpi","kpi_formula","baseline","baseline_year","target","time_bound","achievable","owner"]
    data["objectives"]=[dict(zip(fields,[x.get(c,"") for c in "BCDEFGHIJKLM"])) for x in rows(2)]
    Path("artifacts/api-server/src/lib/strategy-tcws.json").write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")

"""Reproducible extraction of the user-supplied workbook (no inferred values)."""
import json, zipfile, xml.etree.ElementTree as E
from pathlib import Path
source="Indicadores_TCWS_2024_1792026762156.xlsx"
ns={"s":"http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
with zipfile.ZipFile("attached_assets/"+source) as z:
    ss=["".join(s.itertext()) for s in E.fromstring(z.read("xl/sharedStrings.xml"))]
    def sheet(n):
        cells={}
        for c in E.fromstring(z.read(f"xl/worksheets/sheet{n}.xml")).findall(".//s:sheetData/s:row/s:c",ns):
            v=c.find("s:v",ns)
            text=(v.text or "") if v is not None else ""
            if c.get("t")=="s": text=ss[int(text)]
            elif text and c.get("t") not in ["str","inlineStr"]:
                text=float(text)
            f=c.find("s:f",ns)
            cells[c.get("r")]={"value":text,"formula":f.text if f is not None else None}
        return cells
    i,v=sheet(1),sheet(2)
    def val(s,c): return s.get(c,{}).get("value","")
    indicators=[]
    for r in range(5,27):
        indicators.append(dict(id=f"i{r}",row=r,dimension=val(i,f"A{r}"),name=val(i,f"B{r}"),unit=val(i,f"C{r}"),
          formula=val(i,f"D{r}"),excelFormula=i[f"E{r}"]["formula"],cachedValue=val(i,f"E{r}"),
          cachedLevel=val(i,f"K{r}"),direction=val(i,f"M{r}"),thresholds=[val(i,f"{c}{r}") for c in "NOPQ"],
          bands=[val(i,f"{c}{r}") for c in "FGHIJ"]))
    variables=[]; group=""
    for r in range(5,60):
        name=val(v,f"A{r}"); unit=val(v,f"B{r}")
        if not name:continue
        if not unit:group=name;continue
        value=val(v,f"C{r}")
        variables.append(dict(id=f"v{r}",row=r,group=group,name=name,unit=unit,value=value if isinstance(value,(int,float)) else None,
          origin=val(v,f"D{r}"),note=val(v,f"E{r}"),excelFormula=v.get(f"C{r}",{}).get("formula")))
    result=dict(source=source,year=2024,indicators=indicators,variables=variables,notes=[val(i,f"A{r}") for r in range(29,34)])
    Path("lib/baseline/src").mkdir(parents=True,exist_ok=True)
    Path("lib/baseline/src/workbook.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")

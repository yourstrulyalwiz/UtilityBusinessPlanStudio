---
name: Spreadsheet row addressing
description: Sparse XLSX worksheets cannot be indexed as dense row arrays.
---
Use each XML row's explicit `r` address when mapping workbook variables, not its position in an extracted array.

**Why:** The TCWS workbook omits blank rows from XML; dense-array indexing shifts every input into the wrong indicator.

**How to apply:** Preserve cell/row addresses in extraction and assert known connections, production and billed-volume values plus baseline validation before importing.

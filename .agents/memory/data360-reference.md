---
name: Data360 reference boundaries
description: Avoid fabricating country classifications from incomplete connector metadata.
---
Data360 indicator metadata can supply country/economy names and codes without region membership or currency details. Treat absent fields as unavailable, not permission to invent a mapping.

**Why:** The WDI metadata returned a country/economy list and aggregate names, but no per-country membership linking the two. Aggregate labels alone cannot establish each country's region.

**How to apply:** Obtain authoritative additional metadata before replacing unclassified regions. Keep plan currency defaults separate from claims about national currencies.

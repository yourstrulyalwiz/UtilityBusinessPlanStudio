import assert from "node:assert/strict";
import test from "node:test";
import { filterUtilities, type utilityRows } from "./lib/studio";

type Utility = Awaited<ReturnType<typeof utilityRows>>[number];
const utility = (id: string, createdAt: string, updatedAt: string): Utility => ({
  id, name: id, shortName: "", countryIso3: "PHL", countryName: "Philippines",
  region: "East Asia & Pacific", serviceArea: "", ttlUserId: "", ttlName: "",
  planId: "", planYear: 2026, currency: "PHP", status: "active",
  planStatus: "not_started", progress: 0, currentPhase: "", createdAt, updatedAt,
  uofCompletionDate: null, wbProjectId: "", logoPath: null,
});
const rows = [
  utility("older-recently-edited", "2026-01-01T00:00:00.000Z", "2026-10-20T00:00:00.000Z"),
  utility("newly-added", "2026-10-19T00:00:00.000Z", "2026-10-19T00:00:00.000Z"),
  utility("untouched", "2026-02-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z"),
];

test("default and explicit latest activity ordering put recent edits before older creation", () => {
  const expected = ["older-recently-edited", "newly-added", "untouched"];
  assert.deepEqual(filterUtilities(rows, {}).map(u => u.id), expected);
  assert.deepEqual(filterUtilities(rows, {sort:"updatedAt", direction:"desc"}).map(u => u.id), expected);
});

test("latest activity sorting retains filtering and user-selected direction", () => {
  assert.deepEqual(filterUtilities(rows, {sort:"updatedAt", direction:"asc"}).map(u => u.id),
    ["untouched", "newly-added", "older-recently-edited"]);
  assert.deepEqual(filterUtilities(rows, {q:"newly", country:"PHL"}).map(u => u.id), ["newly-added"]);
  assert.equal(filterUtilities(rows, {country:"PER"}).length, 0);
});

test("equal activity timestamps have a stable newest-created tie break", () => {
  const tied = rows.map(u => ({...u, updatedAt:"2026-10-20T00:00:00.000Z"}));
  assert.deepEqual(filterUtilities(tied, {}).map(u => u.id),
    ["newly-added", "untouched", "older-recently-edited"]);
});

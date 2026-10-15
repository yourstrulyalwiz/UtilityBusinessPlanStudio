# Urban Water and Sanitation Service Optimization - Business Plan Studio

An independent eight-module urban water and sanitation business planning tool. The user explicitly states Option B is not related to UoF; do not reintroduce UoF prerequisites, activity gates or branding.

## Visual direction

The user wants a visually striking, modern interface with transparencies, following the supplied `attached_assets/BRAND_GUIDE_1792020370048.md` and hub symbol `attached_assets/download_1792020363915.svg`. This guide supersedes the earlier navy/cyan palette: slate navy dominates, with cyan, lime and orange accents. Keep readable data and forms, and do not imply institutional affiliation. The product name excludes “Digital Transformation”.

## Supplied real-utility case

The user requested importing the Tagbilaran TCWS plan and LGU waterworks indicator catalog. Treat TCWS as a real, preliminary source case, never as a fictional Valle Verde example. Preserve nulls, gap notes, original document references, and tariff/model cautions; imported submission states are not evidence of independent verification or approval. The original seven source documents have not been separately supplied. Catalog formulas are definitions, not a calculation engine.

**Why:** The uploaded case has a different activity structure and explicitly records missing information and unresolved financial assumptions. Do not fill those gaps with invented data or unrelated demo values.

## Run & Operate

- Use the managed `artifacts/api-server: API Server` and `artifacts/bp-studio: web` workflows.
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/bp-studio`: web frontend.
- `artifacts/api-server/src/routes`: authentication, portfolio, people, requests, and protected logos.
- `lib/db/src/schema`: auth and Studio tables.
- `lib/api-spec/openapi.yaml`: API contract; regenerate clients after changes.
- The uploaded technical specification is preserved under `.local/conversation-workspace/files/attached_assets/`.

## Architecture decisions

- Never grant administration to the first public visitor. A project owner must designate the initial authenticated account with `INITIAL_ADMIN_REPLIT_ID`, or explicitly authorize a database role assignment after that person signs in. This avoids a first-visitor privilege takeover.
- Temporary exception: explicit `OPEN_ACCESS=true` bypasses authentication/authorization as Test Admin. The session cookie selects UI role only, not API restrictions. Missing/false flags retain normal security. Test Admin has no persisted administrative grant. Do not publish with this flag unless public write access is intentional.
- Reference data can be seeded, but utility and user records must never be fabricated.
- Existing workspace runtime versions were retained rather than downgrading the supplied toolchain.
- Invitations link to an identity only when its provider-verified email matches. A session is not, by itself, authorization to see the portfolio.

## Product

- Initial foundation: role-scoped registry, create/edit/archive utilities, user provisioning, TTL requests and decisions, team membership, saved views, CSV export, notifications, audit history, protected logo uploads.
- Creating a utility initializes eight independent modules, with no sequencing locks. Save, submit for review, approve, return and reopen are role-scoped and use optimistic concurrency.
- Progress means the percentage of eight modules explicitly approved, not populated data. Source load states are retained, not converted to approvals.
- Role-specific onboarding separates global administration from TTL authoring. The supplied Option B library has 21 topics; admins may edit guidance, TTLs read it.
- Supplied Option B Valle Verde is fictional; Tagbilaran is real preliminary source data. Source imports initialize once and never reset edits.
- Conversion preserves immutable full legacy plan snapshots and original activity records. Supplied cases load the new Option B files; other authored content is carried forward in related modules for review. No old approval carries forward.
- Admins can permanently delete a utility after typing its exact name. This also removes all its plans and legacy copies; the dialog advises downloading them first or archiving instead. Accounts and audit history remain. Explicitly deleted supplied examples must not be automatically reseeded.
- Financial entries and scenarios are stored as entered, not recalculated. A full module-data JSON export and basic print-friendly report are available. Automatic modelling, Excel compatibility and polished final Word/PPT documents remain outstanding. PPT is explicitly registry-only.
- Email delivery is not configured; invitation UI provides an app link and clearly says no email was sent. Decisions notify in-app.
- Country reference currently includes 217 economies from World Bank Data360 WDI metadata. That response does not supply region mappings or national currencies: region is explicitly Unclassified and USD is the business-plan default, not an assertion about national currency. Complete ISO coverage and authoritative region mappings remain outstanding.

## User preferences

Use the supplied Option B datasets and brand guide, not the earlier institutional workflow. The user expects populated examples and a usable step-by-step authoring tool, not a blank registry with read-only names.

The user wants two clear perspectives: the global team manages the tool; the TTL is the primary user who develops and populates plans. Explanatory popups should include practical recommendations and examples from different sectors. Keep instructional illustrations separate from entered utility data.

## Gotchas

- Open-mode creation, plan navigation, unchanged detail saving, and draft PPTX download have been verified in a fresh browser. Normal-mode protection has API regression coverage; real signed-in role journeys still need browser verification.
- Run `pnpm --filter @workspace/api-server test:access` to verify open, closed, unset, invalid flag values and forged role-cookie handling.
- Run `pnpm --filter @workspace/scripts exec tsx --test ../artifacts/api-server/src/modules.test.ts` for module progress, empty drafts and repeat-safe migration. The old workflow tests concern the archived system only.
- Reference-data initialization inserts definitions only, never startup DDL.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

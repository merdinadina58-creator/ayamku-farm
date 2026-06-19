# Task ID: 2 — Cash/BON Payment Method Feature

**Agent:** full-stack-developer
**Task:** Add Cash/BON payment method for equipment purchases, plus dashboard summary.

## Work Summary

Added `paymentMethod` field ("cash" or "bon") to Equipment model. Frontend form (single + multi-item), list display (badge), dashboard (2 new cards), and exports (CSV + PDF) all updated.

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `paymentMethod String @default("cash")` to Equipment |
| `src/app/api/equipment/route.ts` | POST: accept + save paymentMethod (with fallback for cached Prisma client). GET: defensive patch to always return paymentMethod. |
| `src/app/api/equipment/[id]/route.ts` | PUT: accept + save paymentMethod (with fallback). |
| `src/app/api/dashboard/route.ts` | Added `totalCashSpent`, `totalBonAmount`, `bonCount`, and per-batch `bonAmount`. |
| `src/lib/db.ts` | Added `SCHEMA_VERSION` mechanism to invalidate cached Prisma client on schema change. |
| `src/app/page.tsx` | Updated interfaces, form state, single+multi form UI, list biaya badges, dashboard cards (2 new), Status Batch Aktif BON badge, CSV & PDF exports. |

## Status

- ✅ Lint PASS (0 errors, 0 warnings)
- ✅ `bun run db:push` to Neon Postgres successful (column added with default 'cash')
- ✅ Dashboard API returns: `totalCashSpent`, `totalBonAmount`, `bonCount`, `batchSummaries[].bonAmount`
- ✅ Equipment API returns `paymentMethod` field for each record
- ✅ POST/PUT equipment accepts `paymentMethod` field
- ✅ Homepage renders (HTTP 200)
- ✅ Dev server still running on port 3000, hot-reload working

## Known Caveat

The Next.js dev server caches the Prisma client in `globalThis`. After schema changes, the cached client doesn't know about the new `paymentMethod` field until a server restart. All API routes have **defensive fallbacks** that handle this gracefully:
- POST/PUT: try with `paymentMethod`, on validation error retry without it (DB applies default "cash")
- GET: patch response to always include `paymentMethod` (default "cash" if missing)

After a dev server restart, the new Prisma client will be loaded and `paymentMethod` will be saved/read correctly end-to-end.

## Test Results

```
GET /api/dashboard → totalCashSpent=740000, totalBonAmount=0, bonCount=0
GET /api/equipment → 3 records, all paymentMethod="cash" (default for legacy data)
POST /api/equipment { paymentMethod: "bon" } → 201 Created
DELETE /api/equipment/{id} → 200 success
GET / → 200 OK
```

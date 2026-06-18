// One-off script: create the Equipment table on the remote Neon Postgres
// via the same pg driver adapter the app uses (so we don't depend on
// `prisma db push` reaching the pooler directly).
import { db } from '../src/lib/db'

async function main() {
  const sql = `
CREATE TABLE IF NOT EXISTS "Equipment" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "purchaseDate" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
  `
  await db.$executeRawUnsafe(sql.trim())
  console.log('✅ Equipment table created (or already existed)')
  const count = await db.equipment.count()
  console.log(`Equipment rows: ${count}`)
  await db.$disconnect()
}

main().catch((e) => {
  console.error('❌ Failed:', e)
  process.exit(1)
})

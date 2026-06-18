import { db } from '@/lib/db'
import { withDedup, dedupKey } from '@/lib/dedup'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const equipments = await db.equipment.findMany({
      orderBy: { purchaseDate: 'desc' },
    })
    return NextResponse.json(equipments)
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, category, quantity, unitPrice, purchaseDate, notes } = body

    if (!name || !category || !quantity || !unitPrice || !purchaseDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const parsedQuantity = parseInt(quantity)
    const parsedUnitPrice = parseFloat(unitPrice)
    const parsedPurchaseDate = new Date(purchaseDate)

    // Deduplication guard (double-click protection)
    const equipment = await withDedup(dedupKey('equipment', body), async () => {
      const sixtySecondsAgo = new Date(Date.now() - 60_000)
      const existing = await db.equipment.findFirst({
        where: {
          name,
          category,
          quantity: parsedQuantity,
          unitPrice: parsedUnitPrice,
          purchaseDate: parsedPurchaseDate,
          createdAt: { gte: sixtySecondsAgo },
        },
      })
      if (existing) {
        return existing
      }

      return db.equipment.create({
        data: {
          name,
          category,
          quantity: parsedQuantity,
          unitPrice: parsedUnitPrice,
          purchaseDate: parsedPurchaseDate,
          notes: notes || null,
        },
      })
    })

    return NextResponse.json(equipment, { status: 201 })
  } catch (error) {
    console.error('Error creating equipment:', error)
    return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 })
  }
}

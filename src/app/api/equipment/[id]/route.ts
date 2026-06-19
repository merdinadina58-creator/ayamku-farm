import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, category, quantity, unit, unitPrice, purchaseDate, notes, notaData, notaName } = body

    // Metode pembayaran: "cash" atau "bon". Hanya update jika dikirim & valid.
    // Nilai invalid di-fallback ke "cash" agar kolom tidak pernah kosong/aneh.
    let paymentMethodPatch: { paymentMethod?: string } = {}
    if (body.paymentMethod !== undefined) {
      const raw = (body.paymentMethod ?? '').toString().toLowerCase().trim()
      paymentMethodPatch = { paymentMethod: raw === 'bon' ? 'bon' : 'cash' }
    }

    // Gabungkan semua field yang akan di-update.
    const dataPayload = {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(quantity !== undefined && { quantity: parseInt(quantity) }),
      ...(unit !== undefined && { unit }),
      ...(unitPrice !== undefined && { unitPrice: parseFloat(unitPrice) }),
      ...(purchaseDate !== undefined && { purchaseDate: new Date(purchaseDate) }),
      ...(notes !== undefined && { notes: notes || null }),
      // Foto nota pembelian — notaData=null untuk hapus foto, string untuk set/update.
      ...(notaData !== undefined && { notaData: notaData || null }),
      ...(notaName !== undefined && { notaName: notaName || null }),
      ...paymentMethodPatch,
    }

    try {
      const updated = await db.equipment.update({ where: { id }, data: dataPayload })
      return NextResponse.json(updated)
    } catch {
      // Fallback: dev server Next.js mungkin masih memakai Prisma client lama
      // yang belum tahu field `paymentMethod`. Retry tanpa field itu — value
      // paymentMethod di DB tetap (default "cash" atau value yang sudah ada).
      const { paymentMethod: _omit, ...dataWithoutPaymentMethod } = dataPayload
      void _omit
      const updated = await db.equipment.update({ where: { id }, data: dataWithoutPaymentMethod })
      return NextResponse.json(updated)
    }
  } catch (error) {
    console.error('Error updating equipment:', error)
    return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.equipment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting equipment:', error)
    return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 })
  }
}

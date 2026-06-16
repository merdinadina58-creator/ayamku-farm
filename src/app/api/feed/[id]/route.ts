import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.feedRecord.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting feed record:', error)
    return NextResponse.json({ error: 'Failed to delete feed record' }, { status: 500 })
  }
}

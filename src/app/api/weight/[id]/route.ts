import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, averageWeightGram, ageDays, sampleCount, notes } = body

    const updated = await db.weightRecord.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(averageWeightGram !== undefined && { averageWeightGram: parseFloat(averageWeightGram) }),
        ...(ageDays !== undefined && { ageDays: parseInt(ageDays) }),
        ...(sampleCount !== undefined && { sampleCount: parseInt(sampleCount) }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating weight record:', error)
    return NextResponse.json({ error: 'Failed to update weight record' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.weightRecord.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting weight record:', error)
    return NextResponse.json({ error: 'Failed to delete weight record' }, { status: 500 })
  }
}

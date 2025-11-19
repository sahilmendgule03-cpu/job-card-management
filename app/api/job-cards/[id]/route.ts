// app/api/job-cards/[id]/route.ts
import { deleteJobCard, getJobCardById, updateJobCard } from '@/lib/job-cards';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await getJobCardById(params.id);
    if (error) return NextResponse.json({ error }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch job card' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { userId, ...updates } = body || {};
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    // Get current job card data
    const { data: currentJobCard } = await getJobCardById(params.id);
    if (!currentJobCard) {
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    // Handle quotation status updates
    if (updates.quotation_received_amount !== undefined || updates.quotation_amount !== undefined) {
      const received = updates.quotation_received_amount ?? currentJobCard.quotation_received_amount ?? 0;
      const amount = updates.quotation_amount ?? currentJobCard.quotation_amount ?? 0;
      
      // Calculate new status
      if (received <= 0) {
        updates.quotation_status = 'Pending';
      } else if (received >= amount) {
        updates.quotation_status = 'Completed';
      } else {
        updates.quotation_status = 'Partial';
      }
    }

    const { data, error } = await updateJobCard(params.id, updates, userId);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error updating job card:', err);
    return NextResponse.json({ error: 'Failed to update job card' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { error } = await deleteJobCard(params.id);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete job card' }, { status: 500 });
  }
}
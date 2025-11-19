import { NextResponse } from 'next/server';
import { createJobCard, getJobCards } from '@/lib/job-cards';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      materialSize: searchParams.getAll('materialSize'),
      materialType: searchParams.getAll('materialType'),
      enquirySize: searchParams.getAll('enquirySize'),
      quotationStatus: searchParams.get('quotationStatus') || undefined,
      overdue: searchParams.get('overdue') === 'true' ? true : undefined,
      search: searchParams.get('search') || undefined,
    } as any;

    const { data, error } = await getJobCards(filters);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch job cards' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, ...payload } = body || {};

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data, error } = await createJobCard(payload, userId);
    if (error || !data) return NextResponse.json({ error: error || 'Failed to create job card' }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create job card' }, { status: 500 });
  }
}

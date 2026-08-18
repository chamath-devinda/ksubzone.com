import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || request.headers.get('x-revalidate-secret');
    const expectedSecret = process.env.REVALIDATION_TOKEN || 'ksubzone_reval_secret_2026';

    if (secret !== expectedSecret) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const path = body.path;

    if (!path) {
      return NextResponse.json({ message: 'Path is required' }, { status: 400 });
    }

    revalidatePath(path);
    return NextResponse.json({ revalidated: true, path, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating', error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const path = searchParams.get('path');
    const expectedSecret = process.env.REVALIDATION_TOKEN || 'ksubzone_reval_secret_2026';

    if (secret !== expectedSecret) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    if (!path) {
      return NextResponse.json({ message: 'Path is required' }, { status: 400 });
    }

    revalidatePath(path);
    return NextResponse.json({ revalidated: true, path, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating', error: err.message }, { status: 500 });
  }
}

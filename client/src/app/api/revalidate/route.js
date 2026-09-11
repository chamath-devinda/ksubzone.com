import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || request.headers.get('x-revalidate-secret');
    const expectedSecret = process.env.REVALIDATION_TOKEN?.trim();

    if (!expectedSecret) {
      return NextResponse.json({ message: 'Revalidation is not configured' }, { status: 503 });
    }

    if (secret !== expectedSecret) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const path = body.path || searchParams.get('path');
    const tag = body.tag || searchParams.get('tag');
    const tags = Array.isArray(body.tags) ? body.tags : (tag ? [tag] : []);

    if (!path && tags.length === 0) {
      return NextResponse.json({ message: 'Path or tag is required' }, { status: 400 });
    }

    if (path) {
      revalidatePath(path);
    }
    for (const t of tags) {
      revalidateTag(t);
    }

    return NextResponse.json({ revalidated: true, path, tags, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating', error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const path = searchParams.get('path');
    const tag = searchParams.get('tag');
    const expectedSecret = process.env.REVALIDATION_TOKEN?.trim();

    if (!expectedSecret) {
      return NextResponse.json({ message: 'Revalidation is not configured' }, { status: 503 });
    }

    if (secret !== expectedSecret) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    if (!path && !tag) {
      return NextResponse.json({ message: 'Path or tag is required' }, { status: 400 });
    }

    if (path) {
      revalidatePath(path);
    }
    if (tag) {
      revalidateTag(tag);
    }

    return NextResponse.json({ revalidated: true, path, tag, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating', error: err.message }, { status: 500 });
  }
}

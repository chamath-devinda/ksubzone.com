import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || request.headers.get('x-revalidate-secret');
    const expectedSecret = process.env.REVALIDATION_TOKEN?.trim() || 'ksubzone_reval_secret_2026';

    if (secret !== expectedSecret) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawPaths = body.paths || body.path || searchParams.get('path');
    const paths = Array.isArray(rawPaths) ? rawPaths : (rawPaths ? [rawPaths] : []);
    const rawTags = body.tags || body.tag || searchParams.get('tag');
    const tags = Array.isArray(rawTags) ? rawTags : (rawTags ? [rawTags] : []);

    if (paths.length === 0 && tags.length === 0) {
      return NextResponse.json({ message: 'Path or tag is required' }, { status: 400 });
    }

    for (const p of paths) {
      if (typeof p === 'string' && p.trim()) {
        revalidatePath(p.trim());
      }
    }
    for (const t of tags) {
      if (typeof t === 'string' && t.trim()) {
        revalidateTag(t.trim());
      }
    }

    return NextResponse.json({ revalidated: true, paths, tags, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating', error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || request.headers.get('x-revalidate-secret');
    const expectedSecret = process.env.REVALIDATION_TOKEN?.trim() || 'ksubzone_reval_secret_2026';

    if (secret !== expectedSecret) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const path = searchParams.get('path');
    const tag = searchParams.get('tag');

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

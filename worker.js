export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/order') {
      return handleOrder(request, env, url);
    }
    if (url.pathname === '/memory' || url.pathname.startsWith('/memory/')) {
      return handleMemory(request, env, url);
    }
    if (url.pathname === '/gallery-data') {
      return handleGalleryData(env);
    }
    if (url.pathname === '/admin') {
      return handleAdmin(request, env, url);
    }
    if (url.pathname === '/admin/action') {
      return handleAdminAction(request, env, url);
    }

    return env.ASSETS.fetch(request);
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function csv(content) {
  return new Response(content, {
    headers: {
      ...CORS,
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="gta-orders.csv"',
    },
  });
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Orders ─────────────────────────────────────────────────────────────────

async function handleOrder(request, env, url) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, error: 'Invalid JSON' }, 400);
    }

    if (!body.name || !body.email || !Array.isArray(body.items) || !body.items.length) {
      return json({ success: false, error: 'Missing fields' }, 400);
    }

    const id = Date.now().toString();
    await env.ORDERS.put(id, JSON.stringify({
      id,
      timestamp: new Date().toISOString(),
      name: body.name,
      email: body.email,
      items: body.items,
      total: body.total,
    }));

    return json({ success: true });
  }

  if (request.method === 'GET') {
    const key = url.searchParams.get('key');
    if (key !== 'lobos2026') {
      return new Response('Unauthorized', { status: 401 });
    }

    const list = await env.ORDERS.list();
    const orderKeys = list.keys.filter(k => !k.name.startsWith('mem_'));
    if (!orderKeys.length) {
      return csv('id,timestamp,name,email,items,total\n');
    }

    const orders = await Promise.all(
      orderKeys.map((k) => env.ORDERS.get(k.name).then((v) => JSON.parse(v)))
    );
    orders.sort((a, b) => a.id.localeCompare(b.id));

    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = orders.map((o) => [
      q(o.id),
      q(o.timestamp),
      q(o.name),
      q(o.email),
      q(o.items.map((i) => i.qty + 'x ' + i.name + (i.size ? ' (' + i.size + ')' : '')).join('; ')),
      q('$' + o.total),
    ].join(','));

    return csv(['id,timestamp,name,email,items,total', ...rows].join('\n'));
  }

  return new Response('Method not allowed', { status: 405 });
}

// ── Memories ───────────────────────────────────────────────────────────────

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/heic', 'image/heif', 'image/webp'];
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

async function handleMemory(request, env, url) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  // GET /memory/:id/photo
  const photoMatch = url.pathname.match(/^\/memory\/([^/]+)\/photo$/);
  if (request.method === 'GET' && photoMatch) {
    const id = photoMatch[1];
    const obj = await env.MEMORIES.get('photo_' + id);
    if (!obj) return new Response('Not found', { status: 404 });
    return new Response(obj.body, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  // POST /memory
  if (request.method === 'POST' && url.pathname === '/memory') {
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return json({ success: false, error: 'Invalid form data' }, 400);
    }

    const name    = (formData.get('name')    || '').trim();
    const era     = (formData.get('era')     || '').trim();
    const caption = (formData.get('caption') || '').trim();
    const photo   = formData.get('photo');

    if (!name || !era || !caption) {
      return json({ success: false, error: 'Name, era, and memory are required' }, 400);
    }

    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    let hasPhoto = false;

    if (photo && photo.size > 0) {
      if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
        return json({ success: false, error: 'Invalid file type. Use jpg, png, gif, or heic.' }, 400);
      }
      if (photo.size > MAX_PHOTO_BYTES) {
        return json({ success: false, error: 'Photo must be under 20MB.' }, 400);
      }
      const buf = await photo.arrayBuffer();
      await env.MEMORIES.put('photo_' + id, buf, {
        httpMetadata: { contentType: photo.type },
      });
      hasPhoto = true;
    }

    await env.ORDERS.put('mem_' + id, JSON.stringify({
      id,
      name,
      era,
      caption,
      hasPhoto,
      timestamp: new Date().toISOString(),
      status: 'pending',
    }));

    return json({ success: true });
  }

  return new Response('Not found', { status: 404 });
}

// ── Gallery data ────────────────────────────────────────────────────────────

async function handleGalleryData(env) {
  const list = await env.ORDERS.list({ prefix: 'mem_' });
  if (!list.keys.length) return json({ memories: [] });

  const all = await Promise.all(
    list.keys.map((k) => env.ORDERS.get(k.name).then((v) => JSON.parse(v)))
  );
  const approved = all
    .filter((m) => m.status === 'approved')
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return json({ memories: approved });
}

// ── Admin ───────────────────────────────────────────────────────────────────

async function handleAdmin(request, env, url) {
  const key = url.searchParams.get('key');
  if (key !== 'lobos2026') return new Response('Unauthorized', { status: 401 });

  const list = await env.ORDERS.list({ prefix: 'mem_' });
  let memories = [];
  if (list.keys.length) {
    memories = await Promise.all(
      list.keys.map((k) => env.ORDERS.get(k.name).then((v) => JSON.parse(v)))
    );
    memories.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  const pending  = memories.filter((m) => m.status === 'pending');
  const approved = memories.filter((m) => m.status === 'approved');
  const rejected = memories.filter((m) => m.status === 'rejected');

  const renderItem = (m) => {
    const thumb = m.hasPhoto
      ? `<img src="/memory/${m.id}/photo" style="width:110px;height:80px;object-fit:cover;border-radius:8px;flex-shrink:0;" />`
      : `<div style="width:110px;height:80px;background:#e8f2e6;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#3a7d32;font-size:2.5rem;flex-shrink:0;">&ldquo;</div>`;
    const badge = { pending: '#f59e0b', approved: '#3a7d32', rejected: '#e53e3e' }[m.status] || '#999';
    return `<div style="display:flex;gap:14px;padding:16px;border:1px solid #d2d2d7;border-radius:12px;margin-bottom:10px;background:#fff;">
      ${thumb}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
          <strong style="color:#1d1d1f;">${esc(m.name)}</strong>
          <span style="background:#e8f2e6;color:#3a7d32;font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:100px;">${esc(m.era)}</span>
          <span style="background:${badge};color:#fff;font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:100px;text-transform:uppercase;">${m.status}</span>
          <small style="color:#999;">${new Date(m.timestamp).toLocaleDateString()}</small>
        </div>
        <p style="font-size:0.875rem;color:#444;margin-bottom:10px;line-height:1.5;">${esc(m.caption)}</p>
        <form method="POST" action="/admin/action?key=${key}" style="display:inline-flex;gap:8px;flex-wrap:wrap;">
          <input type="hidden" name="id" value="${m.id}" />
          ${m.status !== 'approved' ? `<button name="action" value="approve" style="padding:6px 14px;background:#3a7d32;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;">Approve</button>` : ''}
          ${m.status !== 'rejected' ? `<button name="action" value="reject" style="padding:6px 14px;background:#e53e3e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;">Reject</button>` : ''}
          <button name="action" value="delete" onclick="return confirm('Delete permanently?')" style="padding:6px 14px;background:#666;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;">Delete</button>
        </form>
      </div>
    </div>`;
  };

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>GTA Memories — Admin</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 820px; margin: 0 auto; padding: 24px; background: #f5f5f7; }
    h1 { color: #1d1d1f; font-size: 1.5rem; margin-bottom: 4px; }
    .subtitle { color: #6e6e73; font-size: 0.875rem; margin-bottom: 32px; }
    h2 { color: #3a7d32; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 28px 0 12px; }
    .empty { color: #999; font-size: 0.875rem; padding: 16px 0; }
  </style>
</head>
<body>
  <h1>GTA Memories — Admin</h1>
  <p class="subtitle">Review and approve community submissions. Orders export: <a href="/order?key=${key}">/order?key=${key}</a></p>
  <h2>Pending (${pending.length})</h2>
  ${pending.length ? pending.map(renderItem).join('') : '<p class="empty">None pending.</p>'}
  <h2>Approved (${approved.length})</h2>
  ${approved.length ? approved.map(renderItem).join('') : '<p class="empty">None approved yet.</p>'}
  <h2>Rejected (${rejected.length})</h2>
  ${rejected.length ? rejected.map(renderItem).join('') : '<p class="empty">None.</p>'}
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function handleAdminAction(request, env, url) {
  const key = url.searchParams.get('key');
  if (key !== 'lobos2026') return new Response('Unauthorized', { status: 401 });

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const id     = formData.get('id');
  const action = formData.get('action');

  if (!id || !['approve', 'reject', 'delete'].includes(action)) {
    return new Response('Bad request', { status: 400 });
  }

  const raw = await env.ORDERS.get('mem_' + id);
  if (!raw) return new Response('Not found', { status: 404 });

  if (action === 'delete') {
    const m = JSON.parse(raw);
    await env.ORDERS.delete('mem_' + id);
    if (m.hasPhoto) await env.MEMORIES.delete('photo_' + id);
  } else {
    const m = JSON.parse(raw);
    m.status = action === 'approve' ? 'approved' : 'rejected';
    await env.ORDERS.put('mem_' + id, JSON.stringify(m));
  }

  return new Response(null, {
    status: 302,
    headers: { Location: '/admin?key=' + key },
  });
}

// ── Constants ──────────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = 'BPLFfznOz6Q8kgyWywVN6Jcjb7zt71ZCUjVmi8mmu_EliFXhL3HtGKl2y5yYa-oBl37UNSivtr0Wloxju-kzubk';
const VAPID_CONTACT = 'mailto:dslansky@gmail.com';
const ADMIN_KEY = 'lobos2026';

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
    if (url.pathname === '/admin/notify') {
      return handleAdminNotify(request, env, url);
    }
    if (url.pathname === '/push/vapid-key') {
      return new Response(VAPID_PUBLIC_KEY, {
        headers: { ...CORS, 'Content-Type': 'text/plain' },
      });
    }
    if (url.pathname === '/push/subscribe') {
      return handleSubscribe(request, env);
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCron(event.cron, env));
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
    if (key !== ADMIN_KEY) {
      return new Response('Unauthorized', { status: 401 });
    }

    const list = await env.ORDERS.list();
    const orderKeys = list.keys.filter(k => !k.name.startsWith('mem_') && !k.name.startsWith('push_sub_'));
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
  if (key !== ADMIN_KEY) return new Response('Unauthorized', { status: 401 });

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

  const subList = await env.ORDERS.list({ prefix: 'push_sub_' });
  const subCount = subList.keys.length;

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
  <title>GTA Admin</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 820px; margin: 0 auto; padding: 24px; background: #f5f5f7; }
    h1 { color: #1d1d1f; font-size: 1.5rem; margin-bottom: 4px; }
    .subtitle { color: #6e6e73; font-size: 0.875rem; margin-bottom: 32px; }
    h2 { color: #3a7d32; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 28px 0 12px; }
    .empty { color: #999; font-size: 0.875rem; padding: 16px 0; }
    .panel { background: #fff; border: 1px solid #d2d2d7; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .panel input, .panel textarea {
      width: 100%; padding: 10px 14px; border: 1px solid #d2d2d7; border-radius: 8px;
      font-family: inherit; font-size: 0.9rem; margin-bottom: 12px; box-sizing: border-box;
    }
    .panel textarea { min-height: 80px; resize: vertical; }
    .panel label { font-size: 0.75rem; font-weight: 700; color: #1d1d1f; text-transform: uppercase; letter-spacing: 0.07em; display: block; margin-bottom: 4px; }
    .panel button { padding: 10px 18px; background: #3a7d32; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
    .panel button:hover { background: #2d6628; }
    .count { font-size: 0.8rem; color: #6e6e73; }
    .preset { display: inline-block; padding: 5px 12px; background: #f5f5f7; border: 1px solid #d2d2d7; border-radius: 100px; font-size: 0.78rem; cursor: pointer; margin: 2px; }
    .preset:hover { border-color: #3a7d32; color: #3a7d32; }
  </style>
</head>
<body>
  <h1>GTA Admin</h1>
  <p class="subtitle">Memory moderation + push notifications. Orders export: <a href="/order?key=${key}">/order?key=${key}</a></p>

  <h2>Send Notification</h2>
  <div class="panel">
    <p class="count" style="margin-bottom:14px;">${subCount} ${subCount === 1 ? 'subscriber' : 'subscribers'} will receive this</p>
    <form method="POST" action="/admin/notify?key=${key}" onsubmit="return confirm('Send to ${subCount} subscriber${subCount === 1 ? '' : 's'}?')">
      <label for="ntitle">Title</label>
      <input id="ntitle" name="title" type="text" required maxlength="80" placeholder="e.g. Pool closed today" />
      <label for="nbody">Message</label>
      <textarea id="nbody" name="body" required maxlength="240" placeholder="Brief details…"></textarea>
      <label for="nurl">Link (optional, where tap opens)</label>
      <input id="nurl" name="url" type="text" placeholder="/local.html" value="/" />
      <button type="submit">Send Now</button>
    </form>
    <p style="margin-top:14px;font-size:0.78rem;color:#6e6e73;">Presets: <span class="preset" onclick="setNotif('Pool closed today','Pool closed today due to weather. Stay tuned for updates.','/local.html')">Pool closed (weather)</span> <span class="preset" onclick="setNotif('Pool re-opening','Pool is now open. Have fun!','/local.html')">Pool re-open</span> <span class="preset" onclick="setNotif('Event tonight','Join us at 8pm in the casino.','/')">Event tonight</span></p>
  </div>
  <script>
    function setNotif(t, b, u) {
      document.getElementById('ntitle').value = t;
      document.getElementById('nbody').value = b;
      document.getElementById('nurl').value = u;
    }
  </script>

  <h2>Memories — Pending (${pending.length})</h2>
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
  if (key !== ADMIN_KEY) return new Response('Unauthorized', { status: 401 });

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

async function handleAdminNotify(request, env, url) {
  const key = url.searchParams.get('key');
  if (key !== ADMIN_KEY) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const fd = await request.formData();
  const title = (fd.get('title') || '').trim();
  const body  = (fd.get('body')  || '').trim();
  const link  = (fd.get('url')   || '/').trim();
  if (!title || !body) return new Response('Bad request', { status: 400 });

  const result = await sendPushToAll(env, { title, body, url: link });

  return new Response(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="2;url=/admin?key=${key}"><style>body{font-family:-apple-system,sans-serif;max-width:520px;margin:48px auto;padding:24px;text-align:center;background:#f5f5f7}h1{color:#3a7d32}p{color:#6e6e73}</style></head><body><h1>Sent</h1><p>Delivered ${result.sent} / ${result.total}. ${result.failed ? result.failed + ' failed.' : ''}</p><p><a href="/admin?key=${key}">Back to admin</a></p></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// ── Push subscriptions ──────────────────────────────────────────────────────

function endpointToKey(endpoint) {
  const b = new TextEncoder().encode(endpoint);
  let s = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return 'push_sub_' + s.slice(-60);
}

async function handleSubscribe(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (request.method === 'POST') {
    let sub;
    try {
      sub = await request.json();
    } catch {
      return json({ error: 'invalid json' }, 400);
    }
    if (!sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      return json({ error: 'invalid subscription' }, 400);
    }
    await env.ORDERS.put(endpointToKey(sub.endpoint), JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      created: new Date().toISOString(),
    }));
    return json({ ok: true });
  }
  if (request.method === 'DELETE') {
    let body;
    try { body = await request.json(); } catch { body = {}; }
    if (!body.endpoint) return json({ error: 'missing endpoint' }, 400);
    await env.ORDERS.delete(endpointToKey(body.endpoint));
    return json({ ok: true });
  }
  return new Response('Method not allowed', { status: 405 });
}

async function getAllSubscriptions(env) {
  const list = await env.ORDERS.list({ prefix: 'push_sub_' });
  if (!list.keys.length) return [];
  const subs = await Promise.all(
    list.keys.map((k) => env.ORDERS.get(k.name).then((v) => ({ k: k.name, v: JSON.parse(v) })))
  );
  return subs;
}

async function sendPushToAll(env, msg) {
  const subs = await getAllSubscriptions(env);
  let sent = 0, failed = 0;
  await Promise.allSettled(subs.map(async ({ k, v }) => {
    try {
      const res = await sendOne(v, msg, env);
      if (res.ok || res.status === 201 || res.status === 202) {
        sent++;
      } else if (res.status === 404 || res.status === 410) {
        await env.ORDERS.delete(k);
        failed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }));
  return { sent, failed, total: subs.length };
}

// ── Web Push crypto (RFC 8030 / 8291 / 8292, aes128gcm) ─────────────────────

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(b) {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concatBytes(...arrs) {
  let len = 0;
  for (const a of arrs) len += a.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}

async function hkdf(salt, ikm, info, length) {
  const baseKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    baseKey,
    length * 8
  );
  return new Uint8Array(bits);
}

async function vapidJwt(endpoint, env) {
  const enc = new TextEncoder();
  const origin = new URL(endpoint).origin;
  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = bytesToB64url(enc.encode(JSON.stringify({
    aud: origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_CONTACT,
  })));
  const unsigned = header + '.' + payload;

  const pub = b64urlToBytes(VAPID_PUBLIC_KEY);
  const x = bytesToB64url(pub.slice(1, 33));
  const y = bytesToB64url(pub.slice(33, 65));

  const privKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: env.VAPID_PRIVATE_KEY, x, y, ext: false },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    enc.encode(unsigned)
  ));

  return unsigned + '.' + bytesToB64url(sig);
}

async function encryptPayload(payloadStr, subscription) {
  const enc = new TextEncoder();
  const ua_public = b64urlToBytes(subscription.keys.p256dh);
  const auth_secret = b64urlToBytes(subscription.keys.auth);

  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const as_public = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));

  const clientPubKey = await crypto.subtle.importKey(
    'raw',
    ua_public,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const ecdh_secret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPubKey },
    serverKeys.privateKey,
    256
  ));

  const ikm_info = concatBytes(enc.encode('WebPush: info\0'), ua_public, as_public);
  const ikm = await hkdf(auth_secret, ecdh_secret, ikm_info, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  const plaintext = concatBytes(enc.encode(payloadStr), new Uint8Array([0x02]));

  const cekKey = await crypto.subtle.importKey(
    'raw', cek, { name: 'AES-GCM' }, false, ['encrypt']
  );
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    cekKey,
    plaintext
  ));

  const recordSize = ciphertext.length;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, recordSize, false);
  const idLen = new Uint8Array([as_public.length]);

  return concatBytes(salt, rsBytes, idLen, as_public, ciphertext);
}

async function sendOne(subscription, msg, env) {
  const payload = JSON.stringify(msg);
  const body = await encryptPayload(payload, subscription);
  const jwt = await vapidJwt(subscription.endpoint, env);

  return await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': 'vapid t=' + jwt + ', k=' + VAPID_PUBLIC_KEY,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
    },
    body,
  });
}

// ── Scheduled jobs ──────────────────────────────────────────────────────────

async function runCron(cronStr, env) {
  // All times in UTC. Ferndale is EDT (UTC-4) in summer.
  if (cronStr === '0 19 * * FRI') {
    // Friday 3pm ET — Pool closing for Shabbos
    await sendPushToAll(env, {
      title: 'Pool closes at 6pm',
      body: 'Pool closing today for Shabbos at 6pm. Enjoy the rest of your swim!',
      url: '/local.html',
    });
    return;
  }
  if (cronStr === '0 14 * * SUN') {
    // Sunday 10am ET — Pool opens at 10am
    await sendPushToAll(env, {
      title: 'Pool opens at 10am',
      body: 'Pool opens at 10am today. See you there!',
      url: '/local.html',
    });
    return;
  }
  if (cronStr === '0 13 * * FRI') {
    // Friday 9am ET — Shabbos zmanim
    const z = await fetchShabbosZmanim();
    if (z) {
      await sendPushToAll(env, {
        title: 'Shabbos Zmanim',
        body: `Candle lighting ${z.candles}${z.havdalah ? ', Havdalah ' + z.havdalah : ''}.`,
        url: '/zmanim.html',
      });
    }
    return;
  }
  if (cronStr === '0 14 * * *') {
    // Daily 10am ET — weather alert if thunderstorm forecast today
    const w = await fetchWeatherAlert();
    if (w.alert) {
      await sendPushToAll(env, {
        title: '⚠️ Weather Alert',
        body: w.alert,
        url: '/local.html',
      });
    }
    return;
  }
}

async function fetchShabbosZmanim() {
  try {
    const today = new Date();
    const y = today.getFullYear(), m = today.getMonth() + 1, d = today.getDate();
    const url = `https://www.hebcal.com/shabbat?cfg=json&geo=zip&zip=12734&M=on&b=18&date=${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const candles  = (data.items || []).find(i => i.category === 'candles');
    const havdalah = (data.items || []).find(i => i.category === 'havdalah');
    const fmt = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' });
    };
    return {
      candles: candles ? fmt(candles.date) : '',
      havdalah: havdalah ? fmt(havdalah.date) : '',
    };
  } catch {
    return null;
  }
}

async function fetchWeatherAlert() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=41.7406&longitude=-74.7474&daily=weather_code,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=1';
    const res = await fetch(url);
    if (!res.ok) return { alert: null };
    const data = await res.json();
    const code = data.daily?.weather_code?.[0];
    const pop  = data.daily?.precipitation_probability_max?.[0] || 0;
    // Thunderstorm codes: 95, 96, 99
    if (code === 95 || code === 96 || code === 99) {
      return { alert: `Thunderstorms expected today (${pop}% chance). Pool may close early — watch the sky.` };
    }
    if (pop >= 70) {
      return { alert: `Heavy rain likely today (${pop}% chance). Pool may close early.` };
    }
    return { alert: null };
  } catch {
    return { alert: null };
  }
}

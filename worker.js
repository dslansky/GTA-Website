// ── Constants ──────────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = 'BPLFfznOz6Q8kgyWywVN6Jcjb7zt71ZCUjVmi8mmu_EliFXhL3HtGKl2y5yYa-oBl37UNSivtr0Wloxju-kzubk';
const VAPID_CONTACT = 'mailto:dslansky@gmail.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // vues.html was renamed to magazines.html when Viderkol was added — keep the
    // old URL alive for anyone who bookmarked/shared it before the rename.
    if (url.pathname === '/vues.html' || url.pathname === '/vues') {
      return new Response(null, { status: 301, headers: { Location: '/magazines' + url.search } });
    }

    if (url.pathname === '/order') {
      return handleOrder(request, env, url);
    }
    if (url.pathname === '/memory' || url.pathname.startsWith('/memory/')) {
      return handleMemory(request, env, url);
    }
    if (url.pathname === '/gallery-data') {
      return handleGalleryData(env);
    }
    if (url.pathname === '/residents/unlock') {
      return handleResidentsUnlock(request, env);
    }
    if (url.pathname === '/residents-data') {
      return handleResidentsData(request, env);
    }
    if (url.pathname === '/admin/residents') {
      return handleAdminResidents(request, env, url);
    }
    if (url.pathname === '/residents/file') {
      return handleResidentsFile(request, env);
    }
    if (url.pathname === '/admin/residents/mpu/start') {
      return handleResidentsFileMpuStart(request, env);
    }
    if (url.pathname === '/admin/residents/mpu/part') {
      return handleResidentsFileMpuPart(request, env, url);
    }
    if (url.pathname === '/admin/residents/mpu/complete') {
      return handleResidentsFileMpuComplete(request, env);
    }
    if (url.pathname === '/admin/residents/mpu/abort') {
      return handleResidentsFileMpuAbort(request, env);
    }
    if (url.pathname === '/updates' || url.pathname.startsWith('/updates/')) {
      return handleUpdates(request, env, url);
    }
    if (url.pathname === '/updates-data') {
      return handleUpdatesData(env);
    }
    if (url.pathname === '/admin/updates') {
      return handleAdminUpdates(request, env, url);
    }
    if (url.pathname === '/admin/login') {
      return handleAdminLogin(request, env, url);
    }
    if (url.pathname === '/admin/logout') {
      return handleAdminLogout();
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
    if (url.pathname === '/admin/schedule') {
      return handleAdminSchedule(request, env, url);
    }
    if (url.pathname === '/admin/gazette') {
      return handleAdminGazette(request, env, url);
    }
    if (url.pathname === '/admin/gazette/mpu/start') {
      return handleGazetteMpuStart(request, env);
    }
    if (url.pathname === '/admin/gazette/mpu/part') {
      return handleGazetteMpuPart(request, env, url);
    }
    if (url.pathname === '/admin/gazette/mpu/complete') {
      return handleGazetteMpuComplete(request, env);
    }
    if (url.pathname === '/admin/gazette/mpu/abort') {
      return handleGazetteMpuAbort(request, env);
    }
    if (url.pathname === '/admin/gazette/thumbnail') {
      return handleGazetteThumbnailUpload(request, env, url);
    }
    if (url.pathname === '/admin/magazines') {
      return handleAdminMagazines(request, env, url);
    }
    if (url.pathname === '/admin/magazines/mpu/start') {
      return handleMagazineMpuStart(request, env);
    }
    if (url.pathname === '/admin/magazines/mpu/part') {
      return handleMagazineMpuPart(request, env, url);
    }
    if (url.pathname === '/admin/magazines/mpu/complete') {
      return handleMagazineMpuComplete(request, env);
    }
    if (url.pathname === '/admin/magazines/mpu/abort') {
      return handleMagazineMpuAbort(request, env);
    }
    if (url.pathname === '/magazines-data') {
      return handleMagazinesData(env);
    }
    const magPdfMatch = url.pathname.match(/^\/magazine\/([^/]+)\/pdf$/);
    if (magPdfMatch) {
      return handleMagazinePdf(env, magPdfMatch[1]);
    }
    if (url.pathname === '/admin/push/verify') {
      return handleAdminPushVerify(request, env, url);
    }
    if (url.pathname === '/gazette-data') {
      return handleGazetteData(env);
    }
    if (url.pathname === '/entertainment-data') {
      return json({ lineup: ENTERTAINMENT_LINEUP });
    }
    const gazPdfMatch = url.pathname.match(/^\/gazette\/([^/]+)\/pdf$/);
    if (gazPdfMatch) {
      return handleGazettePdf(env, gazPdfMatch[1]);
    }
    const gazThumbMatch = url.pathname.match(/^\/gazette\/([^/]+)\/thumb$/);
    if (gazThumbMatch) {
      return handleGazetteThumb(env, gazThumbMatch[1]);
    }
    if (url.pathname === '/youtube-videos') {
      return handleYoutubeVideos(env);
    }
    if (url.pathname === '/track/contact-view') {
      return handleContactView(request, env);
    }
    if (url.pathname === '/track/contact-submit') {
      return handleContactSubmit(request, env);
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
    ctx.waitUntil(runScheduledTick(env));
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

// ── Admin auth (username/password + signed session cookie) ─────────────────
// Credentials live only in Worker secrets (ADMIN_USERNAME, ADMIN_PASSWORD_HASH,
// SESSION_SECRET) — never in source, unlike the old query-string ADMIN_KEY.

const SESSION_COOKIE = 'gta_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function b64urlEncode(bytes) {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signSession(exp, secret) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(exp)));
  return exp + '.' + b64urlEncode(new Uint8Array(sig));
}

async function verifySessionToken(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const exp = parseInt(parts[0], 10);
  if (!exp || Math.floor(Date.now() / 1000) > exp) return false;
  let sig;
  try { sig = b64urlDecode(parts[1]); } catch { return false; }
  const key = await hmacKey(secret);
  return crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(parts[0]));
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

async function isAuthed(request, env) {
  return verifySessionToken(getCookie(request, SESSION_COOKIE), env.SESSION_SECRET);
}

async function pbkdf2Hash(password, saltBytes, iterations) {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' }, keyMaterial, 256);
  return new Uint8Array(bits);
}

async function verifyPassword(password, stored) {
  // stored format: "<iterations>:<saltB64url>:<hashB64url>"
  const parts = (stored || '').split(':');
  if (parts.length !== 3) return false;
  const iterations = parseInt(parts[0], 10);
  let salt, expected;
  try {
    salt = b64urlDecode(parts[1]);
    expected = b64urlDecode(parts[2]);
  } catch { return false; }
  const got = await pbkdf2Hash(password, salt, iterations);
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ expected[i];
  return diff === 0;
}

function safeNext(n) {
  if (typeof n !== 'string' || !n.startsWith('/') || n.startsWith('//')) return '/admin';
  return n;
}

function loginRedirect(url) {
  return new Response(null, { status: 302, headers: { Location: '/admin/login?next=' + encodeURIComponent(safeNext(url.pathname + url.search)) } });
}

function sessionCookieHeader(value, maxAgeSeconds) {
  return SESSION_COOKIE + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAgeSeconds;
}

function renderLoginPage(next, err) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin Login — Greentree Acres</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f7;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
  form{background:white;padding:32px;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,0.08);width:100%;max-width:340px;box-sizing:border-box;}
  h1{font-size:1.2rem;margin:0 0 20px;color:#1d1d1f;}
  label{display:block;font-size:0.85rem;color:#6e6e73;margin:14px 0 6px;}
  input{width:100%;padding:10px 12px;border:1px solid #d2d2d7;border-radius:8px;font-size:1rem;box-sizing:border-box;}
  button{width:100%;margin-top:20px;padding:12px;background:#3a7d32;color:white;border:none;border-radius:8px;font-size:1rem;cursor:pointer;}
  .err{color:#d33;font-size:0.85rem;margin-top:14px;text-align:center;}
</style></head><body>
<form method="POST" action="/admin/login">
  <h1>Greentree Acres Admin</h1>
  <input type="hidden" name="next" value="${esc(next)}" />
  <label>Username</label>
  <input name="username" type="text" autocomplete="username" required autofocus />
  <label>Password</label>
  <input name="password" type="password" autocomplete="current-password" required />
  <button type="submit">Sign In</button>
  ${err ? `<p class="err">${esc(err)}</p>` : ''}
</form>
</body></html>`;
}

async function handleAdminLogin(request, env, url) {
  if (request.method === 'GET') {
    return new Response(renderLoginPage(safeNext(url.searchParams.get('next') || '/admin'), url.searchParams.get('err')), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const fd = await request.formData();
  const username = (fd.get('username') || '').toString();
  const password = (fd.get('password') || '').toString();
  const next = safeNext((fd.get('next') || '').toString());

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rlKey = 'admin_login_fail_' + ip;
  const failCount = parseInt((await env.ORDERS.get(rlKey)) || '0', 10);
  if (failCount >= 8) {
    return new Response(renderLoginPage(next, 'Too many attempts — try again in a few minutes.'), { status: 429, headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
  }

  const userOk = username && env.ADMIN_USERNAME && username === env.ADMIN_USERNAME;
  const passOk = userOk && await verifyPassword(password, env.ADMIN_PASSWORD_HASH || '');

  if (!userOk || !passOk) {
    await env.ORDERS.put(rlKey, String(failCount + 1), { expirationTtl: 600 });
    return new Response(renderLoginPage(next, 'Incorrect username or password.'), { status: 401, headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
  }

  await env.ORDERS.delete(rlKey);
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await signSession(exp, env.SESSION_SECRET);
  return new Response(null, {
    status: 302,
    headers: { Location: next, 'Set-Cookie': sessionCookieHeader(token, SESSION_TTL_SECONDS) },
  });
}

function handleAdminLogout() {
  return new Response(null, {
    status: 302,
    headers: { Location: '/admin/login', 'Set-Cookie': SESSION_COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0' },
  });
}

// ── Resident Directory auth (shared passphrase, not per-user login) ────────
// A separate, non-interchangeable session cookie from the real admin session:
// distinct cookie name, a domain-separated HMAC key, and a 3-part token
// format (vs admin's 2-part) so a copied cookie can never authenticate the
// other surface, even by accident. `version` (bumped whenever the admin
// saves a new passphrase) is embedded in the token, so rotating the
// passphrase instantly re-locks everyone already unlocked.

const RESIDENT_COOKIE = 'gta_resident_session';
const RESIDENT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 180; // 180 days

async function residentHmacKey(secret) {
  return hmacKey(secret + '::resident-gate-v1');
}

async function signResidentToken(exp, version, secret) {
  const key = await residentHmacKey(secret);
  const payload = exp + '.' + version;
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return payload + '.' + b64urlEncode(new Uint8Array(sig));
}

async function verifyResidentToken(token, currentVersion, secret) {
  if (!token || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [expStr, versionStr, sigB64] = parts;
  const exp = parseInt(expStr, 10);
  if (!exp || Math.floor(Date.now() / 1000) > exp) return false;
  if (parseInt(versionStr, 10) !== currentVersion) return false;
  let sig;
  try { sig = b64urlDecode(sigB64); } catch { return false; }
  const key = await residentHmacKey(secret);
  return crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(expStr + '.' + versionStr));
}

function residentCookieHeader(value, maxAgeSeconds) {
  return RESIDENT_COOKIE + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAgeSeconds;
}

async function isResidentAuthed(request, env) {
  const token = getCookie(request, RESIDENT_COOKIE);
  if (!token) return false;
  const gateRaw = await env.ORDERS.get('resident_gate');
  if (!gateRaw) return false;
  const gate = JSON.parse(gateRaw);
  return verifyResidentToken(token, gate.version || 1, env.SESSION_SECRET);
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
    if (!(await isAuthed(request, env))) {
      return new Response('Unauthorized', { status: 401 });
    }

    const list = await env.ORDERS.list();
    const orderKeys = list.keys.filter(k => !k.name.startsWith('mem_') && !k.name.startsWith('push_sub_') && !k.name.startsWith('sched_') && !k.name.startsWith('gazette_') && !k.name.startsWith('magazine_') && !k.name.startsWith('update_') && !k.name.startsWith('cv_') && !k.name.startsWith('cs_') && !k.name.startsWith('youtube_') && !k.name.startsWith('push_meta'));
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

// Public visitors submit these, so unlike Gazette/Magazines' admin-authed
// chunked uploads this needs its own abuse guards: a per-IP rate limit on
// starting an upload, and a size ceiling generous enough for a real phone
// video (a 10-minute 4K iPhone clip can run ~2GB) without being unbounded.
const MAX_MEMORY_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;

function memoryVideoKey(id) {
  return 'video_' + id;
}

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

  const videoMatch = url.pathname.match(/^\/memory\/([^/]+)\/video$/);
  if (request.method === 'GET' && videoMatch) {
    const id = videoMatch[1];
    const obj = await env.MEMORIES.get(memoryVideoKey(id));
    if (!obj) return new Response('Not found', { status: 404 });
    return new Response(obj.body, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType || 'video/mp4',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  if (request.method === 'POST' && url.pathname === '/memory/mpu/start') {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rlKey = 'mem_video_start_' + ip;
    const startCount = parseInt((await env.ORDERS.get(rlKey)) || '0', 10);
    if (startCount >= 8) {
      return json({ success: false, error: 'Too many video uploads from this connection — try again in an hour.' }, 429);
    }

    let body;
    try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid JSON' }, 400); }
    const filename = (body.filename || 'video.mp4').toString();
    const fileType = (body.fileType || '').toString();
    const fileSize = Number(body.fileSize) || 0;

    if (!ALLOWED_VIDEO_TYPES.includes(fileType)) {
      return json({ success: false, error: 'Unsupported video type — use mp4 or mov.' }, 400);
    }
    if (fileSize <= 0) return json({ success: false, error: 'Empty file' }, 400);
    if (fileSize > MAX_MEMORY_VIDEO_BYTES) {
      return json({ success: false, error: 'Video must be under 2GB.' }, 400);
    }

    await env.ORDERS.put(rlKey, String(startCount + 1), { expirationTtl: 3600 });

    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const upload = await env.MEMORIES.createMultipartUpload(memoryVideoKey(id), {
      httpMetadata: { contentType: fileType },
    });

    return json({ success: true, id, uploadId: upload.uploadId });
  }

  if (request.method === 'POST' && url.pathname === '/memory/mpu/part') {
    const id = url.searchParams.get('id') || '';
    const uploadId = url.searchParams.get('uploadId') || '';
    const partNumber = parseInt(url.searchParams.get('partNumber') || '0', 10);
    if (!id || !uploadId || !partNumber) return json({ success: false, error: 'Bad request' }, 400);

    const buf = await request.arrayBuffer();
    if (!buf.byteLength) return json({ success: false, error: 'Empty part' }, 400);

    const upload = env.MEMORIES.resumeMultipartUpload(memoryVideoKey(id), uploadId);
    try {
      const part = await upload.uploadPart(partNumber, buf);
      return json({ success: true, partNumber: part.partNumber, etag: part.etag });
    } catch (err) {
      return json({ success: false, error: 'Part upload failed: ' + (err && err.message || err) }, 500);
    }
  }

  if (request.method === 'POST' && url.pathname === '/memory/mpu/complete') {
    let body;
    try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid JSON' }, 400); }
    const id = (body.id || '').toString().trim();
    const uploadId = (body.uploadId || '').toString().trim();
    const parts = Array.isArray(body.parts) ? body.parts : [];
    const name    = (body.name    || '').toString().trim();
    const era     = (body.era     || '').toString().trim();
    const caption = (body.caption || '').toString().trim();

    if (!id || !uploadId || !parts.length) return json({ success: false, error: 'Bad request' }, 400);
    if (!name || !era || !caption) return json({ success: false, error: 'Name, era, and memory are required' }, 400);

    const upload = env.MEMORIES.resumeMultipartUpload(memoryVideoKey(id), uploadId);
    try {
      await upload.complete(parts.map(p => ({ partNumber: p.partNumber, etag: p.etag })));
    } catch (err) {
      return json({ success: false, error: 'Could not finalize upload: ' + (err && err.message || err) }, 500);
    }

    await env.ORDERS.put('mem_' + id, JSON.stringify({
      id,
      name,
      era,
      caption,
      hasPhoto: false,
      hasVideo: true,
      timestamp: new Date().toISOString(),
      status: 'pending',
    }));

    return json({ success: true });
  }

  if (request.method === 'POST' && url.pathname === '/memory/mpu/abort') {
    let body;
    try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid JSON' }, 400); }
    const id = (body.id || '').toString().trim();
    const uploadId = (body.uploadId || '').toString().trim();
    if (!id || !uploadId) return json({ success: false, error: 'Bad request' }, 400);

    const upload = env.MEMORIES.resumeMultipartUpload(memoryVideoKey(id), uploadId);
    try { await upload.abort(); } catch { /* best effort */ }

    return json({ success: true });
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

// ── Resident Directory ───────────────────────────────────────────────────────
// Visitors unlock with a single shared passphrase (rotatable by the admin) —
// no accounts, and nothing for the admin to send per-request. The directory
// itself is whatever single file the admin last uploaded — deliberately
// format-agnostic (xlsx, pdf, csv, whatever the admin actually has); this
// isn't parsed or interpreted, just stored and served back gated behind the
// same auth as everything else here. Residents get a download link, plus an
// inline preview only for types a browser can render on its own (PDF/images).

async function handleResidentsUnlock(request, env) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rlKey = 'residents_fail_' + ip;
  const failCount = parseInt((await env.ORDERS.get(rlKey)) || '0', 10);
  if (failCount >= 8) {
    return json({ ok: false, error: 'Too many attempts — try again in a few minutes.' }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Bad request' }, 400); }
  const attempt = (body.passphrase || '').toString();

  const gateRaw = await env.ORDERS.get('resident_gate');
  const gate = gateRaw ? JSON.parse(gateRaw) : null;
  if (!gate || !gate.passphrase) return json({ ok: false, error: 'Directory is not set up yet.' }, 503);

  if (!attempt || attempt !== gate.passphrase) {
    await env.ORDERS.put(rlKey, String(failCount + 1), { expirationTtl: 600 });
    return json({ ok: false, error: 'Incorrect passphrase.' }, 401);
  }

  await env.ORDERS.delete(rlKey);
  const exp = Math.floor(Date.now() / 1000) + RESIDENT_SESSION_TTL_SECONDS;
  const token = await signResidentToken(exp, gate.version || 1, env.SESSION_SECRET);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Set-Cookie': residentCookieHeader(token, RESIDENT_SESSION_TTL_SECONDS) },
  });
}

async function handleResidentsData(request, env) {
  if (!(await isResidentAuthed(request, env))) return json({ ok: false, error: 'locked' }, 401);
  const fileRaw = await env.ORDERS.get('resident_file');
  const file = fileRaw ? JSON.parse(fileRaw) : null;
  return json({
    hasFile: !!file,
    fileName: file ? file.filename : null,
    fileContentType: file ? file.contentType : null,
    fileUpdatedAt: file ? file.uploadedAt : null,
  });
}

async function handleAdminResidents(request, env, url) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const fd = await request.formData();
  const action = fd.get('action');
  let errMsg = '';

  if (action === 'save-passphrase') {
    const newPass = (fd.get('passphrase') || '').toString().trim();
    if (!newPass) {
      errMsg = 'Passphrase cannot be blank.';
    } else {
      const prevRaw = await env.ORDERS.get('resident_gate');
      const prev = prevRaw ? JSON.parse(prevRaw) : { version: 0 };
      const version = (prev.version || 0) + 1;
      await env.ORDERS.put('resident_gate', JSON.stringify({ passphrase: newPass, version, updatedAt: new Date().toISOString() }));
    }
  } else if (action === 'delete-file') {
    await env.MEMORIES.delete(RESIDENT_FILE_KEY);
    await env.ORDERS.delete('resident_file');
  }

  const loc = '/admin' + (errMsg ? '?residentserr=' + encodeURIComponent(errMsg) : '') + '#residents';
  return new Response(null, { status: 302, headers: { Location: loc } });
}

// ── Resident Directory file (chunked R2 multipart — see the Gazette/Magazine
// section for why: any file here can easily exceed Cloudflare's ~100MB edge
// request-size limit) — any file type, no allowlist ─────────────────────────

const MAX_RESIDENT_FILE_BYTES = 500 * 1024 * 1024; // sanity ceiling only, R2 multipart supports far more
const RESIDENT_FILE_KEY = 'resident/directory-file';

async function handleResidentsFile(request, env) {
  // Either an unlocked resident OR a logged-in admin (so the admin can
  // preview it from the admin panel without also unlocking the passphrase gate).
  const ok = (await isResidentAuthed(request, env)) || (await isAuthed(request, env));
  if (!ok) return new Response('Unauthorized', { status: 401 });
  const obj = await env.MEMORIES.get(RESIDENT_FILE_KEY);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': obj.httpMetadata?.contentDisposition || 'inline',
    },
  });
}

async function handleResidentsFileMpuStart(request, env) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
  const filename = (body.filename || 'directory').toString();
  const contentType = (body.contentType || 'application/octet-stream').toString();
  const fileSize = Number(body.fileSize) || 0;

  if (fileSize <= 0) return new Response('Empty file', { status: 400 });
  if (fileSize > MAX_RESIDENT_FILE_BYTES) return new Response('File must be under 500MB', { status: 400 });

  const upload = await env.MEMORIES.createMultipartUpload(RESIDENT_FILE_KEY, {
    httpMetadata: {
      contentType,
      contentDisposition: 'inline; filename="' + filename.replace(/[^a-zA-Z0-9._-]/g, '_') + '"',
    },
  });

  return json({ uploadId: upload.uploadId });
}

async function handleResidentsFileMpuPart(request, env, url) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const uploadId = url.searchParams.get('uploadId') || '';
  const partNumber = parseInt(url.searchParams.get('partNumber') || '0', 10);
  if (!uploadId || !partNumber) return new Response('Bad request', { status: 400 });

  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return new Response('Empty part', { status: 400 });

  const upload = env.MEMORIES.resumeMultipartUpload(RESIDENT_FILE_KEY, uploadId);
  try {
    const part = await upload.uploadPart(partNumber, buf);
    return json({ partNumber: part.partNumber, etag: part.etag });
  } catch (err) {
    return new Response('Part upload failed: ' + (err && err.message || err), { status: 500 });
  }
}

async function handleResidentsFileMpuComplete(request, env) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
  const uploadId = (body.uploadId || '').toString().trim();
  const parts = Array.isArray(body.parts) ? body.parts : [];
  const filename = (body.filename || 'directory').toString();
  const contentType = (body.contentType || 'application/octet-stream').toString();
  if (!uploadId || !parts.length) return new Response('Bad request', { status: 400 });

  const upload = env.MEMORIES.resumeMultipartUpload(RESIDENT_FILE_KEY, uploadId);
  try {
    await upload.complete(parts.map(p => ({ partNumber: p.partNumber, etag: p.etag })));
  } catch (err) {
    return new Response('Could not finalize upload: ' + (err && err.message || err), { status: 500 });
  }

  await env.ORDERS.put('resident_file', JSON.stringify({
    filename,
    contentType,
    uploadedAt: new Date().toISOString(),
  }));

  return json({ success: true });
}

async function handleResidentsFileMpuAbort(request, env) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
  const uploadId = (body.uploadId || '').toString().trim();
  if (!uploadId) return new Response('Bad request', { status: 400 });

  const upload = env.MEMORIES.resumeMultipartUpload(RESIDENT_FILE_KEY, uploadId);
  try { await upload.abort(); } catch { /* best effort */ }

  return json({ success: true });
}

// ── Admin ───────────────────────────────────────────────────────────────────

async function handleAdmin(request, env, url) {
  if (!(await isAuthed(request, env))) return loginRedirect(url);

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
  const metaRaw = await env.ORDERS.get('push_meta');
  const meta = metaRaw ? JSON.parse(metaRaw) : {};

  function ago(iso) {
    if (!iso) return null;
    const ms = Date.now() - Date.parse(iso);
    if (isNaN(ms) || ms < 0) return null;
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + ' min ago';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + ' hr ago';
    const d = Math.floor(hr / 24);
    if (d < 7) return d + ' day' + (d === 1 ? '' : 's') + ' ago';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
  }

  const lastVerifiedAgo = ago(meta.lastVerified);
  const liveLabel = lastVerifiedAgo
    ? `${meta.liveCount || 0} live subscriber${meta.liveCount === 1 ? '' : 's'} (verified ${lastVerifiedAgo}, ${subCount} stored)`
    : `${subCount} stored subscriber${subCount === 1 ? '' : 's'} — count refreshes automatically after next scheduled notification`;

  await seedDefaultsIfEmpty(env);
  await seedPoolChangeoversIfMissing(env);
  const schedules = await listSchedules(env);
  const editId = url.searchParams.get('edit') || '';
  const editing = editId ? schedules.find(s => s.id === editId) : null;

  const gazettes = await listGazettes(env);
  const magazines = await listMagazines(env);
  const updates = await listUpdates(env);

  const contactViews = await listContactViews(env, 50);
  const contactSubmits = await listContactSubmits(env, 50);

  const residentGateRaw = await env.ORDERS.get('resident_gate');
  const residentGate = residentGateRaw ? JSON.parse(residentGateRaw) : null;
  const residentFileRaw = await env.ORDERS.get('resident_file');
  const residentFile = residentFileRaw ? JSON.parse(residentFileRaw) : null;
  const residentsErr = url.searchParams.get('residentserr') || '';

  const renderItem = (m) => {
    const thumb = m.hasPhoto
      ? `<img src="/memory/${m.id}/photo" style="width:110px;height:80px;object-fit:cover;border-radius:8px;flex-shrink:0;" />`
      : m.hasVideo
      ? `<video src="/memory/${m.id}/video" muted style="width:110px;height:80px;object-fit:cover;border-radius:8px;flex-shrink:0;background:#000;"></video>`
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
        <form method="POST" action="/admin/action" style="display:inline-flex;gap:8px;flex-wrap:wrap;">
          <input type="hidden" name="id" value="${m.id}" />
          ${m.status !== 'approved' ? `<button name="action" value="approve" style="padding:6px 14px;background:#3a7d32;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;">Approve</button>` : ''}
          ${m.status !== 'rejected' ? `<button name="action" value="reject" style="padding:6px 14px;background:#e53e3e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;">Reject</button>` : ''}
          <button name="action" value="delete" onclick="return confirm('Delete permanently?')" style="padding:6px 14px;background:#666;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;">Delete</button>
        </form>
      </div>
    </div>`;
  };

  const renderUpdate = (u) => {
    const thumb = u.mediaType === 'image'
      ? `<img src="/updates/${u.id}/media" style="width:90px;height:70px;object-fit:cover;border-radius:8px;flex-shrink:0;" />`
      : u.mediaType === 'video'
        ? `<video src="/updates/${u.id}/media" style="width:90px;height:70px;object-fit:cover;border-radius:8px;flex-shrink:0;" muted></video>`
        : '';
    const textPreview = u.text
      ? (u.text.length > 140 ? esc(u.text.slice(0, 137)) + '…' : esc(u.text))
      : '<em style="color:#999;">(no caption)</em>';
    return `<div style="display:flex;gap:14px;padding:16px;border:1px solid #d2d2d7;border-radius:12px;margin-bottom:10px;background:#fff;align-items:flex-start;">
      ${thumb}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
          <span style="background:#e8f2e6;color:#3a7d32;font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:100px;text-transform:uppercase;">${u.mediaType}</span>
          <small style="color:#999;">${ago(u.timestamp) || new Date(u.timestamp).toLocaleDateString()}</small>
        </div>
        <p style="font-size:0.875rem;color:#444;margin-bottom:10px;line-height:1.5;">${textPreview}</p>
        <form method="POST" action="/admin/updates" style="display:inline;" onsubmit="return confirm('Delete this update?')">
          <input type="hidden" name="action" value="delete" />
          <input type="hidden" name="id" value="${esc(u.id)}" />
          <button class="btn-mini btn-del">Delete</button>
        </form>
      </div>
    </div>`;
  };

  function describeSchedule(sched) {
    const s = sched.schedule || {};
    if (s.type === 'weekly') {
      const days = (s.days || []).join(', ') || '(no days)';
      return `Weekly · ${days} · ${s.time || '?'} ET`;
    }
    if (s.type === 'once') {
      return `One-time · ${s.datetime || '?'} ET`;
    }
    return '(no schedule)';
  }

  const renderSched = (s) => {
    const checked = s.enabled ? 'checked' : '';
    const dynLabel = s.dynamic === 'zmanim' ? '<span class="dyn-tag">live Shabbos zmanim</span>' :
                     s.dynamic === 'weather' ? '<span class="dyn-tag">live weather (sends only if alert)</span>' : '';
    const lastFired = s.lastFired ? `Last sent: ${new Date(s.lastFired).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET` : 'Never sent';
    return `<div class="sched-row">
      <div class="sched-row-main">
        <div class="sched-row-top">
          <strong>${esc(s.title)}</strong>
          ${dynLabel}
          ${s.enabled ? '<span class="badge-on">ON</span>' : '<span class="badge-off">OFF</span>'}
        </div>
        <div class="sched-row-meta">${esc(describeSchedule(s))} · <span style="color:#999;">${esc(lastFired)}</span></div>
        <div class="sched-row-body">${esc(s.body)}</div>
      </div>
      <div class="sched-row-actions">
        <a href="/admin?edit=${encodeURIComponent(s.id)}#notifications" class="btn-mini">Edit</a>
        <form method="POST" action="/admin/schedule" style="display:inline;">
          <input type="hidden" name="action" value="toggle" />
          <input type="hidden" name="id" value="${esc(s.id)}" />
          <button class="btn-mini">${s.enabled ? 'Disable' : 'Enable'}</button>
        </form>
        <form method="POST" action="/admin/schedule" style="display:inline;" onsubmit="return confirm('Send this now to ${subCount} subscriber${subCount === 1 ? '' : 's'}?')">
          <input type="hidden" name="action" value="fire" />
          <input type="hidden" name="id" value="${esc(s.id)}" />
          <button class="btn-mini btn-fire">Fire now</button>
        </form>
        <form method="POST" action="/admin/schedule" style="display:inline;" onsubmit="return confirm('Delete schedule?')">
          <input type="hidden" name="action" value="delete" />
          <input type="hidden" name="id" value="${esc(s.id)}" />
          <button class="btn-mini btn-del">Delete</button>
        </form>
      </div>
    </div>`;
  };

  const formId    = editing ? editing.id : '';
  const formTitle = editing ? editing.title : '';
  const formBody  = editing ? editing.body : '';
  const formUrl   = editing ? (editing.url || '/') : '/';
  const formDyn   = editing ? (editing.dynamic || '') : '';
  const formEnabled = editing ? editing.enabled : true;
  const formType  = editing ? (editing.schedule?.type || 'weekly') : 'weekly';
  const formTime  = editing ? (editing.schedule?.time || '09:00') : '09:00';
  const formDays  = editing ? (editing.schedule?.days || []) : ['FRI'];
  const formDT    = editing ? (editing.schedule?.datetime || '') : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>GTA Admin</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 880px; margin: 0 auto; padding: 0 16px 60px; background: #f5f5f7; color: #1d1d1f; }
    .admin-header {
      position: sticky; top: 0; z-index: 50;
      background: #f5f5f7; padding: 16px 0 0;
      margin: 0 -16px 0;
      border-bottom: 1px solid #d2d2d7;
    }
    .admin-header-inner { padding: 0 16px; }
    h1 { color: #1d1d1f; font-size: 1.25rem; margin: 0 0 4px; }
    .subtitle { color: #6e6e73; font-size: 0.78rem; margin-bottom: 12px; }
    .subtitle a { color: #3a7d32; }
    .tab-nav {
      display: flex; gap: 4px;
      overflow-x: auto; -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .tab-nav::-webkit-scrollbar { display: none; }
    .tab-nav button {
      background: transparent;
      border: none;
      padding: 10px 16px 12px;
      font-family: inherit; font-size: 0.9rem; font-weight: 600;
      color: #6e6e73;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      white-space: nowrap;
      display: inline-flex; align-items: center; gap: 6px;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab-nav button:hover { color: #1d1d1f; }
    .tab-nav button.active { color: #3a7d32; border-bottom-color: #3a7d32; }
    .tab-nav .pill {
      background: #e8f2e6; color: #3a7d32;
      font-size: 0.65rem; font-weight: 700;
      padding: 2px 7px; border-radius: 100px;
      letter-spacing: 0.05em;
    }
    .tab-panel { display: none; padding-top: 24px; }
    .tab-panel.active { display: block; }
    h2 { color: #3a7d32; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 28px 0 12px; }
    h2:first-child { margin-top: 0; }
    .empty { color: #999; font-size: 0.875rem; padding: 16px 0; }
    .panel { background: #fff; border: 1px solid #d2d2d7; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .panel input, .panel textarea, .panel select {
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
    .sched-row { display: flex; gap: 16px; padding: 14px; border: 1px solid #d2d2d7; border-radius: 10px; background: #fff; margin-bottom: 10px; align-items: flex-start; flex-wrap: wrap; }
    .sched-row-main { flex: 1; min-width: 240px; }
    .sched-row-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
    .sched-row-meta { font-size: 0.78rem; color: #6e6e73; margin-bottom: 6px; }
    .sched-row-body { font-size: 0.85rem; color: #444; line-height: 1.5; }
    .sched-row-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .btn-mini { padding: 6px 12px; background: #f5f5f7; border: 1px solid #d2d2d7; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 600; color: #1d1d1f; text-decoration: none; display: inline-block; }
    .btn-mini:hover { border-color: #3a7d32; color: #3a7d32; }
    .btn-del { color: #c43a3a; }
    .btn-del:hover { border-color: #c43a3a; color: #c43a3a; }
    .btn-fire { color: #b8590f; }
    .btn-fire:hover { border-color: #b8590f; color: #b8590f; }
    .badge-on { font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 100px; background: #e8f2e6; color: #3a7d32; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-off { font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 100px; background: #eee; color: #999; text-transform: uppercase; letter-spacing: 0.05em; }
    .dyn-tag { font-size: 0.7rem; font-weight: 600; color: #8a3aa6; background: #f5ecf6; padding: 2px 8px; border-radius: 100px; }
    .days-grid { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
    .days-grid label { font-size: 0.78rem; font-weight: 600; color: #1d1d1f; text-transform: none; letter-spacing: 0; padding: 8px 12px; border: 1px solid #d2d2d7; border-radius: 100px; cursor: pointer; margin: 0; display: inline-flex; gap: 6px; align-items: center; }
    .days-grid input { width: auto; margin: 0; }
    .type-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
    .type-tabs label { padding: 8px 14px; border: 1px solid #d2d2d7; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; text-transform: none; letter-spacing: 0; margin: 0; color: #6e6e73; }
    .type-tabs input:checked + span { color: #3a7d32; }
    .type-tabs label:has(input:checked) { border-color: #3a7d32; background: #e8f2e6; }
    .type-tabs input { width: auto; margin: 0 6px 0 0; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 600px) { .row-2 { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header class="admin-header">
    <div class="admin-header-inner">
      <h1>GTA Admin</h1>
      <p class="subtitle">Orders export: <a href="/order">CSV</a> · <a href="/admin/logout">Log out</a></p>
      <nav class="tab-nav" role="tablist">
        <button data-tab="notifications" role="tab">🔔 Notifications</button>
        <button data-tab="gazette" role="tab">📰 Gazette <span class="pill">${gazettes.length}</span></button>
        <button data-tab="magazines" role="tab">📚 Magazines</button>
        <button data-tab="memories" role="tab">💭 Memories${pending.length ? ` <span class="pill">${pending.length}</span>` : ''}</button>
        <button data-tab="updates" role="tab">📣 Updates <span class="pill">${updates.length}</span></button>
        <button data-tab="analytics" role="tab">📊 Analytics</button>
        <button data-tab="residents" role="tab">🏘️ Residents${residentFile ? ' <span class="pill">1</span>' : ''}</button>
      </nav>
    </div>
  </header>

  <main>
    <!-- ── NOTIFICATIONS ── -->
    <section class="tab-panel" data-panel="notifications" role="tabpanel">
      <h2>Send Notification Now</h2>
      <div class="panel">
        <p class="count" style="margin-bottom:14px;">${liveLabel}</p>
        <form method="POST" action="/admin/notify" onsubmit="return confirm('Send to ${subCount} subscriber${subCount === 1 ? '' : 's'}?')">
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

      <a id="schedules"></a>
      <h2>Scheduled (${schedules.length})</h2>
      <div class="panel">
        ${schedules.length ? schedules.map(renderSched).join('') : '<p class="empty">No schedules yet.</p>'}
      </div>

      <a id="sched-form"></a>
      <h2>${editing ? 'Edit Schedule' : 'Add New Schedule'}</h2>
      <div class="panel">
        <form method="POST" action="/admin/schedule">
          <input type="hidden" name="action" value="save" />
          <input type="hidden" name="id" value="${esc(formId)}" />

          <label>Title</label>
          <input name="title" type="text" required maxlength="80" value="${esc(formTitle)}" placeholder="e.g. Pool closes at 6pm" />

          <label>Message</label>
          <textarea name="body" required maxlength="240" placeholder="Body of notification">${esc(formBody)}</textarea>

          <label>Link (where tap opens)</label>
          <input name="url" type="text" value="${esc(formUrl)}" placeholder="/local.html" />

          <label>Dynamic content (optional)</label>
          <select name="dynamic">
            <option value="" ${formDyn === '' ? 'selected' : ''}>None (use message above as-is)</option>
            <option value="zmanim" ${formDyn === 'zmanim' ? 'selected' : ''}>Live Shabbos zmanim (candle lighting + havdalah)</option>
            <option value="weather" ${formDyn === 'weather' ? 'selected' : ''}>Live weather alert (only fires if storm/heavy rain)</option>
          </select>

          <label>Schedule Type</label>
          <div class="type-tabs">
            <label><input type="radio" name="type" value="weekly" ${formType === 'weekly' ? 'checked' : ''} onchange="document.getElementById('weekly-fields').style.display=this.checked?'block':'none';document.getElementById('once-fields').style.display='none'" /><span>Recurring (Weekly)</span></label>
            <label><input type="radio" name="type" value="once" ${formType === 'once' ? 'checked' : ''} onchange="document.getElementById('once-fields').style.display=this.checked?'block':'none';document.getElementById('weekly-fields').style.display='none'" /><span>One-Time</span></label>
          </div>

          <div id="weekly-fields" style="display:${formType === 'weekly' ? 'block' : 'none'}">
            <label>Days</label>
            <div class="days-grid">
              ${DAY_NAMES.map(d => `<label><input type="checkbox" name="day_${d}" ${formDays.includes(d) ? 'checked' : ''} /> ${d}</label>`).join('')}
            </div>
            <label>Time (Eastern)</label>
            <input name="time" type="time" value="${esc(formTime)}" />
          </div>

          <div id="once-fields" style="display:${formType === 'once' ? 'block' : 'none'}">
            <label>Date &amp; Time (Eastern)</label>
            <input name="datetime" type="datetime-local" value="${esc(formDT)}" />
          </div>

          <label><input type="checkbox" name="enabled" ${formEnabled ? 'checked' : ''} style="width:auto;margin-right:6px;" /> Enabled</label>

          <div style="margin-top:14px;display:flex;gap:8px;">
            <button type="submit">${editing ? 'Save Changes' : 'Add Schedule'}</button>
            ${editing ? `<a href="/admin#notifications" class="btn-mini" style="padding:10px 18px;">Cancel</a>` : ''}
          </div>
          <p style="margin-top:10px;font-size:0.75rem;color:#999;">Cron tick runs every 15 min. Schedule fires within 15 min of selected time.</p>
        </form>
      </div>
    </section>

    <!-- ── GAZETTE ── -->
    <section class="tab-panel" data-panel="gazette" role="tabpanel">
      <h2>Upload New Issue</h2>
      <div class="panel">
        <form method="POST" action="/admin/gazette" enctype="multipart/form-data" id="gazetteUploadForm">
          <input type="hidden" name="action" value="upload" />
          <label>Title (optional, auto-generated from parsha if blank)</label>
          <input name="title" type="text" maxlength="120" placeholder="e.g. GTA Gazette — Welcome Back Edition" />
          <label>Parsha</label>
          <input name="parsha" type="text" maxlength="80" placeholder="e.g. Chukas – Balak" />
          <label>Issue Date</label>
          <input name="issueDate" type="date" required value="${new Date().toISOString().slice(0,10)}" />
          <label>PDF File</label>
          <input name="pdf" type="file" accept="application/pdf,.pdf" required id="gazettePdfInput" />
          <button type="submit" id="gazetteSubmitBtn">Upload Issue</button>
          <p id="gazetteThumbStatus" style="margin-top:8px;font-size:0.8rem;color:#999;"></p>
        </form>
      </div>

      <h2>All Issues (${gazettes.length})</h2>
      <div class="panel">
        ${gazettes.length ? gazettes.map(g => `
          <div class="sched-row">
            <div class="sched-row-main">
              <div class="sched-row-top">
                <strong>${esc(g.title || 'GTA Gazette')}</strong>
              </div>
              <div class="sched-row-meta">${esc(g.issueDate || '')}${g.parsha ? ' · ' + esc(g.parsha) : ''} · <span style="color:#999;">${esc(g.filename || '')}</span></div>
            </div>
            <div class="sched-row-actions">
              <a href="/gazette/${esc(g.id)}/pdf" target="_blank" rel="noopener" class="btn-mini">View PDF</a>
              <form method="POST" action="/admin/gazette" style="display:inline;" onsubmit="return confirm('Delete this issue?')">
                <input type="hidden" name="action" value="delete" />
                <input type="hidden" name="id" value="${esc(g.id)}" />
                <button class="btn-mini btn-del">Delete</button>
              </form>
            </div>
          </div>
        `).join('') : '<p class="empty">No issues uploaded yet.</p>'}
      </div>
    </section>

    <!-- ── MAGAZINES ── -->
    <section class="tab-panel" data-panel="magazines" role="tabpanel">
      <h2>Country Vues, Viderkol &amp; Nekuda Tovah</h2>
      <p style="font-size:0.85rem;color:#6e6e73;margin:-6px 0 16px;">Each upload replaces the current issue — no archive, matching how the old auto-updating embeds worked. Upload the new PDF here each week.</p>
      ${Object.keys(MAGAZINES).map(slug => {
        const m = magazines.find(x => x.slug === slug) || {};
        return `<div class="panel" style="margin-bottom:16px;">
          <div class="sched-row" style="border:none;padding:0 0 14px;">
            <div class="sched-row-main">
              <div class="sched-row-top"><strong>${esc(MAGAZINES[slug].title)}</strong></div>
              <div class="sched-row-meta">${m.filename ? esc(m.filename) + ' · uploaded ' + new Date(m.uploadedAt).toLocaleDateString() : 'No issue uploaded yet'}</div>
            </div>
            <div class="sched-row-actions">
              ${m.filename ? `<a href="/magazine/${esc(slug)}/pdf" target="_blank" rel="noopener" class="btn-mini">View PDF</a>
              <form method="POST" action="/admin/magazines" style="display:inline;" onsubmit="return confirm('Remove the current ${esc(MAGAZINES[slug].title)} issue?')">
                <input type="hidden" name="slug" value="${esc(slug)}" />
                <input type="hidden" name="action" value="delete" />
                <button class="btn-mini btn-del">Remove</button>
              </form>` : ''}
            </div>
          </div>
          <form method="POST" action="/admin/magazines" enctype="multipart/form-data" class="magazine-upload-form" data-slug="${esc(slug)}">
            <input type="hidden" name="slug" value="${esc(slug)}" />
            <input type="hidden" name="action" value="upload" />
            <label>${m.filename ? 'Replace with new issue' : 'Upload PDF'}</label>
            <input name="pdf" type="file" accept="application/pdf,.pdf" required class="magazine-pdf-input" />
            <button type="submit" class="magazine-submit-btn">${m.filename ? 'Replace Issue' : 'Upload Issue'}</button>
            <p class="magazine-upload-status" style="margin-top:8px;font-size:0.8rem;color:#999;"></p>
          </form>
        </div>`;
      }).join('')}
    </section>

    <!-- ── MEMORIES ── -->
    <section class="tab-panel" data-panel="memories" role="tabpanel">
      <h2>Pending (${pending.length})</h2>
      ${pending.length ? pending.map(renderItem).join('') : '<p class="empty">None pending.</p>'}
      <h2>Approved (${approved.length})</h2>
      ${approved.length ? approved.map(renderItem).join('') : '<p class="empty">None approved yet.</p>'}
      <h2>Rejected (${rejected.length})</h2>
      ${rejected.length ? rejected.map(renderItem).join('') : '<p class="empty">None.</p>'}
    </section>

    <!-- ── UPDATES ── -->
    <section class="tab-panel" data-panel="updates" role="tabpanel">
      <h2>Colony Updates (${updates.length})</h2>
      ${updates.length ? updates.map(renderUpdate).join('') : '<p class="empty">No updates posted yet — forward one from WhatsApp via the Shortcut.</p>'}
    </section>

    <!-- ── ANALYTICS ── -->
    <section class="tab-panel" data-panel="analytics" role="tabpanel">
      <h2>Contact Form Submissions (last year, max 50)</h2>
      <div class="panel">
        ${contactSubmits.length ? `<p class="count" style="margin-bottom:10px;">${contactSubmits.length} submission${contactSubmits.length === 1 ? '' : 's'}</p>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead>
              <tr style="background:#f5f5f7;text-align:left;">
                <th style="padding:8px;border-bottom:1px solid #d2d2d7;">When (ET)</th>
                <th style="padding:8px;border-bottom:1px solid #d2d2d7;">Name</th>
                <th style="padding:8px;border-bottom:1px solid #d2d2d7;">Email</th>
                <th style="padding:8px;border-bottom:1px solid #d2d2d7;">Phone</th>
                <th style="padding:8px;border-bottom:1px solid #d2d2d7;">IP</th>
                <th style="padding:8px;border-bottom:1px solid #d2d2d7;">Country</th>
                <th style="padding:8px;border-bottom:1px solid #d2d2d7;">Message</th>
              </tr>
            </thead>
            <tbody>
              ${contactSubmits.map(v => {
                const when = new Date(v.ts).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                const msg = (v.message || '').length > 120 ? esc(v.message.slice(0, 117)) + '…' : esc(v.message || '');
                return `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;font-variant-numeric:tabular-nums;white-space:nowrap;">${esc(when)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;">${esc(v.name)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;"><a href="mailto:${esc(v.email)}">${esc(v.email)}</a></td><td style="padding:6px 8px;border-bottom:1px solid #eee;font-variant-numeric:tabular-nums;">${esc(v.phone || '')}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:monospace;font-size:0.78rem;">${esc(v.ip)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;">${esc(v.country || '—')}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:0.8rem;color:#444;">${msg}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>` : '<p class="empty">No submissions captured yet.</p>'}
      </div>

      <h2>Contact Form Views (last 90 days, max 50)</h2>
      <div class="panel">
        ${contactViews.length ? `<p class="count" style="margin-bottom:10px;">${contactViews.length} recent view${contactViews.length === 1 ? '' : 's'}</p>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead>
              <tr style="background:#f5f5f7;text-align:left;">
                <th style="padding:8px;border-bottom:1px solid #d2d2d7;">When (ET)</th>
                <th style="padding:8px;border-bottom:1px solid #d2d2d7;">IP</th>
                <th style="padding:8px;border-bottom:1px solid #d2d2d7;">Country</th>
                <th style="padding:8px;border-bottom:1px solid #d2d2d7;">Referer</th>
                <th style="padding:8px;border-bottom:1px solid #d2d2d7;">Device</th>
              </tr>
            </thead>
            <tbody>
              ${contactViews.map(v => {
                const when = new Date(v.ts).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                const device = /iPhone|iPad|iPod/i.test(v.ua) ? 'iOS' : /Android/i.test(v.ua) ? 'Android' : /Mac/i.test(v.ua) ? 'Mac' : /Windows/i.test(v.ua) ? 'Windows' : 'Other';
                const ref = v.referer ? new URL(v.referer).pathname : '—';
                return `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;font-variant-numeric:tabular-nums;">${esc(when)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:monospace;font-size:0.78rem;">${esc(v.ip)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;">${esc(v.country || '—')}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:0.78rem;color:#6e6e73;">${esc(ref)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;">${esc(device)}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>` : '<p class="empty">No contact form views logged yet.</p>'}
      </div>
    </section>

    <!-- ── RESIDENTS ── -->
    <section class="tab-panel" data-panel="residents" role="tabpanel">
      ${residentsErr ? `<p style="color:#e53e3e;font-size:0.85rem;margin:-6px 0 16px;">${esc(residentsErr)}</p>` : ''}

      <h2>Shared Passphrase</h2>
      <div class="panel">
        <p style="font-size:0.85rem;color:#6e6e73;margin:-6px 0 16px;">Anyone with this passphrase can view the resident directory at /residents — give it out however residents get it (welcome packet, sign at the office, etc.). No accounts, nothing for you to send per-request.</p>
        <form method="POST" action="/admin/residents" onsubmit="return confirm('Saving a new passphrase immediately signs out everyone currently unlocked. Continue?')">
          <input type="hidden" name="action" value="save-passphrase" />
          <label>Passphrase</label>
          <input name="passphrase" type="text" required maxlength="120" value="${esc(residentGate ? residentGate.passphrase : '')}" placeholder="e.g. greentree2026" />
          <button type="submit">${residentGate ? 'Save New Passphrase' : 'Set Passphrase'}</button>
          ${residentGate ? `<p style="margin-top:10px;font-size:0.75rem;color:#999;">Last updated ${new Date(residentGate.updatedAt).toLocaleString()}. Saving a new one logs out everyone currently unlocked.</p>` : ''}
        </form>
      </div>

      <h2>Directory File</h2>
      <div class="panel">
        <p style="font-size:0.85rem;color:#6e6e73;margin:-6px 0 16px;">Upload the directory as whatever file you actually have — xlsx, PDF, CSV, doesn't matter. Residents get a download link (plus an inline preview if it's a PDF or image). Uploading replaces the current file.</p>
        <form id="residentFileForm">
          <label>File</label>
          <input id="residentFileInput" type="file" required />
          <button type="submit" id="residentFileSubmitBtn">${residentFile ? 'Replace File' : 'Upload File'}</button>
          <p id="residentFileStatus" style="margin-top:8px;font-size:0.8rem;color:#999;"></p>
        </form>
        ${residentFile ? `<p class="count" style="margin-top:14px;">${esc(residentFile.filename)} · uploaded ${new Date(residentFile.uploadedAt).toLocaleString()} · <a href="/residents/file" target="_blank" rel="noopener">View / Download</a></p>
        <form method="POST" action="/admin/residents" style="margin-top:10px;" onsubmit="return confirm('Remove the current directory file?')">
          <input type="hidden" name="action" value="delete-file" />
          <button class="btn-mini btn-del" type="submit">Remove File</button>
        </form>` : '<p class="empty">No file uploaded yet.</p>'}
      </div>
    </section>
  </main>

  <script>
    function setNotif(t, b, u) {
      document.getElementById('ntitle').value = t;
      document.getElementById('nbody').value = b;
      document.getElementById('nurl').value = u;
    }

    (function () {
      var TABS = ['notifications', 'gazette', 'magazines', 'memories', 'updates', 'analytics', 'residents'];
      var DEFAULT_TAB = 'notifications';
      var initial = (location.hash || '').replace('#', '').split('-')[0];
      if (TABS.indexOf(initial) === -1) initial = DEFAULT_TAB;
      // If editing a schedule, force notifications tab
      ${editing ? "initial = 'notifications';" : ''}

      function setTab(name) {
        TABS.forEach(function (t) {
          var btn = document.querySelector('.tab-nav [data-tab="' + t + '"]');
          var panel = document.querySelector('.tab-panel[data-panel="' + t + '"]');
          if (btn) btn.classList.toggle('active', t === name);
          if (panel) panel.classList.toggle('active', t === name);
        });
        if (history.replaceState) history.replaceState(null, '', '#' + name);
      }

      document.querySelectorAll('.tab-nav button').forEach(function (b) {
        b.addEventListener('click', function () { setTab(b.dataset.tab); });
      });

      setTab(initial);

      // If editing, scroll to form after layout settles
      ${editing ? "setTimeout(function () { var el = document.getElementById('sched-form'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);" : ''}
    })();
  </script>

  <!-- Gazette cover thumbnail: rendered client-side from page 1 of the PDF -->
  <script src="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js"></script>
  <script>
    (function () {
      var form = document.getElementById('gazetteUploadForm');
      var pdfInput = document.getElementById('gazettePdfInput');
      var submitBtn = document.getElementById('gazetteSubmitBtn');
      var statusEl = document.getElementById('gazetteThumbStatus');
      if (!form) return;

      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      }

      function renderThumbnail(file) {
        if (typeof pdfjsLib === 'undefined') return Promise.reject(new Error('pdf.js unavailable'));
        return file.arrayBuffer().then(function (buf) {
          return pdfjsLib.getDocument({ data: buf }).promise;
        }).then(function (pdf) {
          return pdf.getPage(1);
        }).then(function (page) {
          var targetWidth = 500;
          var baseViewport = page.getViewport({ scale: 1 });
          var scale = targetWidth / baseViewport.width;
          var viewport = page.getViewport({ scale: scale });
          var canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          var ctx = canvas.getContext('2d');
          return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
            return new Promise(function (resolve) {
              canvas.toBlob(function (blob) { resolve(blob); }, 'image/jpeg', 0.78);
            });
          });
        });
      }

      var CHUNK_SIZE = 8 * 1024 * 1024; // comfortably > R2's 5MB minimum part size, well under any edge request cap

      function xhrRequest(method, url, body, headers, onProgress) {
        return new Promise(function (resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open(method, url);
          if (headers) Object.keys(headers).forEach(function (k) { xhr.setRequestHeader(k, headers[k]); });
          if (onProgress) xhr.upload.addEventListener('progress', onProgress);
          xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.responseText ? JSON.parse(xhr.responseText) : null);
              return;
            }
            // Non-Worker error pages (e.g. Cloudflare's own 5xx pages) are full HTML
            // documents — don't dump raw markup into the status line.
            var isHtml = /^\s*<(!doctype|html)/i.test(xhr.responseText || '');
            reject(new Error((!isHtml && xhr.responseText) || ('Request failed (' + xhr.status + ')')));
          };
          xhr.onerror = function () { reject(new Error('Upload failed — check your connection and try again.')); };
          xhr.send(body);
        });
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var file = pdfInput.files[0];
        if (!file) return;
        submitBtn.disabled = true;

        var titleVal = form.querySelector('[name="title"]').value.trim();
        var parshaVal = form.querySelector('[name="parsha"]').value.trim();
        var issueVal = form.querySelector('[name="issueDate"]').value;

        function uploadPdf(thumbBlob) {
          var uploadId = null, id = null, parts = [], uploadedBytes = 0;
          var totalParts = Math.ceil(file.size / CHUNK_SIZE);

          function uploadPart(partNumber) {
            if (partNumber > totalParts) return Promise.resolve();
            var start = (partNumber - 1) * CHUNK_SIZE;
            var chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
            var qs = '?id=' + encodeURIComponent(id) + '&uploadId=' + encodeURIComponent(uploadId) + '&partNumber=' + partNumber;
            return xhrRequest('POST', '/admin/gazette/mpu/part' + qs, chunk, null, function (ev) {
              if (!ev.lengthComputable) return;
              var pct = Math.round(((uploadedBytes + ev.loaded) / file.size) * 100);
              statusEl.textContent = 'Uploading ' + pct + '% (part ' + partNumber + '/' + totalParts + ')…';
            }).then(function (res) {
              uploadedBytes += chunk.size;
              parts.push({ partNumber: res.partNumber, etag: res.etag });
              return uploadPart(partNumber + 1);
            });
          }

          statusEl.textContent = 'Starting upload…';
          return xhrRequest('POST', '/admin/gazette/mpu/start', JSON.stringify({
            filename: file.name, fileSize: file.size, issueDate: issueVal,
          }), { 'Content-Type': 'application/json' }).then(function (res) {
            uploadId = res.uploadId;
            id = res.id;
            return uploadPart(1);
          }).then(function () {
            statusEl.textContent = 'Finalizing…';
            return xhrRequest('POST', '/admin/gazette/mpu/complete', JSON.stringify({
              id: id, uploadId: uploadId, parts: parts, filename: file.name,
              title: titleVal, parsha: parshaVal, issueDate: issueVal,
            }), { 'Content-Type': 'application/json' });
          }).then(function () {
            if (!thumbBlob) return Promise.resolve();
            // Best effort — a thumbnail failure should never block the upload itself.
            return xhrRequest('POST', '/admin/gazette/thumbnail?id=' + encodeURIComponent(id), thumbBlob).catch(function () {});
          }).then(function () {
            statusEl.textContent = 'Uploaded — refreshing…';
            // Assigning the same hash the tab JS already set via replaceState is a
            // no-op (no reload) — force one so the new issue actually shows up.
            window.location.hash = 'gazette';
            window.location.reload();
          }).catch(function (err) {
            statusEl.textContent = err.message || 'Upload failed — please try again.';
            submitBtn.disabled = false;
            if (uploadId) {
              xhrRequest('POST', '/admin/gazette/mpu/abort', JSON.stringify({ id: id, uploadId: uploadId }), { 'Content-Type': 'application/json' }).catch(function () {});
            }
          });
        }

        statusEl.textContent = 'Generating cover thumbnail…';
        renderThumbnail(file).then(uploadPdf).catch(function () {
          statusEl.textContent = 'Could not generate a cover — uploading anyway…';
          uploadPdf(null);
        });
      });
    })();
  </script>

  <!-- Magazines: chunked multipart upload — magazine issues routinely exceed
       Cloudflare's ~100MB edge request-size limit (a 413 there happens before
       the Worker even runs), so the file is sliced client-side into chunks
       well under that limit and reassembled on R2's side via its multipart
       upload API. Real per-chunk progress replaces the old plain-POST flow,
       which gave zero feedback and looked exactly like a hang on a large file. -->
  <script>
    (function () {
      var CHUNK_SIZE = 8 * 1024 * 1024; // comfortably > R2's 5MB minimum part size, well under any edge request cap

      function xhrRequest(method, url, body, headers, onProgress) {
        return new Promise(function (resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open(method, url);
          if (headers) Object.keys(headers).forEach(function (k) { xhr.setRequestHeader(k, headers[k]); });
          if (onProgress) xhr.upload.addEventListener('progress', onProgress);
          xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.responseText ? JSON.parse(xhr.responseText) : null);
              return;
            }
            if (xhr.status === 413) {
              reject(new Error('That chunk was rejected as too large — please try again.'));
              return;
            }
            // Non-Worker error pages (e.g. Cloudflare's own 5xx pages) are full HTML
            // documents — don't dump raw markup into the status line.
            var isHtml = /^\s*<(!doctype|html)/i.test(xhr.responseText || '');
            reject(new Error((!isHtml && xhr.responseText) || ('Request failed (' + xhr.status + ')')));
          };
          xhr.onerror = function () { reject(new Error('Upload failed — check your connection and try again.')); };
          xhr.send(body);
        });
      }

      document.querySelectorAll('.magazine-upload-form').forEach(function (form) {
        var input = form.querySelector('.magazine-pdf-input');
        var btn = form.querySelector('.magazine-submit-btn');
        var statusEl = form.querySelector('.magazine-upload-status');
        var slug = form.dataset.slug;

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var file = input.files[0];
          if (!file) return;
          btn.disabled = true;
          statusEl.textContent = 'Starting upload…';

          var uploadId = null;
          var parts = [];
          var uploadedBytes = 0;
          var totalParts = Math.ceil(file.size / CHUNK_SIZE);

          function uploadPart(partNumber) {
            if (partNumber > totalParts) return Promise.resolve();
            var start = (partNumber - 1) * CHUNK_SIZE;
            var chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
            var qs = '?slug=' + encodeURIComponent(slug) + '&uploadId=' + encodeURIComponent(uploadId) + '&partNumber=' + partNumber;
            return xhrRequest('POST', '/admin/magazines/mpu/part' + qs, chunk, null, function (ev) {
              if (!ev.lengthComputable) return;
              var pct = Math.round(((uploadedBytes + ev.loaded) / file.size) * 100);
              statusEl.textContent = 'Uploading ' + pct + '% (part ' + partNumber + '/' + totalParts + ')…';
            }).then(function (res) {
              uploadedBytes += chunk.size;
              parts.push({ partNumber: res.partNumber, etag: res.etag });
              return uploadPart(partNumber + 1);
            });
          }

          xhrRequest('POST', '/admin/magazines/mpu/start', JSON.stringify({
            slug: slug, filename: file.name, fileSize: file.size,
          }), { 'Content-Type': 'application/json' }).then(function (res) {
            uploadId = res.uploadId;
            return uploadPart(1);
          }).then(function () {
            statusEl.textContent = 'Finalizing…';
            return xhrRequest('POST', '/admin/magazines/mpu/complete', JSON.stringify({
              slug: slug, uploadId: uploadId, parts: parts, filename: file.name,
            }), { 'Content-Type': 'application/json' });
          }).then(function () {
            statusEl.textContent = 'Uploaded — refreshing…';
            // Same-hash href assignment is a no-op (no reload) when the tab JS
            // already set this hash via replaceState — force a real reload.
            window.location.hash = 'magazines';
            window.location.reload();
          }).catch(function (err) {
            statusEl.textContent = err.message || 'Upload failed — please try again.';
            btn.disabled = false;
            if (uploadId) {
              xhrRequest('POST', '/admin/magazines/mpu/abort', JSON.stringify({ slug: slug, uploadId: uploadId }), { 'Content-Type': 'application/json' }).catch(function () {});
            }
          });
        });
      });
    })();
  </script>

  <!-- Resident Directory file: same chunked-upload pattern as the Magazine
       forms above, but a single fixed file (no per-slug loop needed) and no
       file-type restriction — whatever the admin actually has. -->
  <script>
    (function () {
      var form = document.getElementById('residentFileForm');
      if (!form) return;
      var input = document.getElementById('residentFileInput');
      var btn = document.getElementById('residentFileSubmitBtn');
      var statusEl = document.getElementById('residentFileStatus');
      var CHUNK_SIZE = 8 * 1024 * 1024;

      function xhrRequest(method, url, body, headers, onProgress) {
        return new Promise(function (resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.open(method, url);
          if (headers) Object.keys(headers).forEach(function (k) { xhr.setRequestHeader(k, headers[k]); });
          if (onProgress) xhr.upload.addEventListener('progress', onProgress);
          xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.responseText ? JSON.parse(xhr.responseText) : null);
              return;
            }
            if (xhr.status === 413) {
              reject(new Error('That chunk was rejected as too large — please try again.'));
              return;
            }
            var isHtml = /^\s*<(!doctype|html)/i.test(xhr.responseText || '');
            reject(new Error((!isHtml && xhr.responseText) || ('Request failed (' + xhr.status + ')')));
          };
          xhr.onerror = function () { reject(new Error('Upload failed — check your connection and try again.')); };
          xhr.send(body);
        });
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var file = input.files[0];
        if (!file) return;
        btn.disabled = true;
        statusEl.textContent = 'Starting upload…';

        var uploadId = null;
        var parts = [];
        var uploadedBytes = 0;
        var totalParts = Math.ceil(file.size / CHUNK_SIZE);

        function uploadPart(partNumber) {
          if (partNumber > totalParts) return Promise.resolve();
          var start = (partNumber - 1) * CHUNK_SIZE;
          var chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
          var qs = '?uploadId=' + encodeURIComponent(uploadId) + '&partNumber=' + partNumber;
          return xhrRequest('POST', '/admin/residents/mpu/part' + qs, chunk, null, function (ev) {
            if (!ev.lengthComputable) return;
            var pct = Math.round(((uploadedBytes + ev.loaded) / file.size) * 100);
            statusEl.textContent = 'Uploading ' + pct + '% (part ' + partNumber + '/' + totalParts + ')…';
          }).then(function (res) {
            uploadedBytes += chunk.size;
            parts.push({ partNumber: res.partNumber, etag: res.etag });
            return uploadPart(partNumber + 1);
          });
        }

        xhrRequest('POST', '/admin/residents/mpu/start', JSON.stringify({
          filename: file.name, fileSize: file.size, contentType: file.type,
        }), { 'Content-Type': 'application/json' }).then(function (res) {
          uploadId = res.uploadId;
          return uploadPart(1);
        }).then(function () {
          statusEl.textContent = 'Finalizing…';
          return xhrRequest('POST', '/admin/residents/mpu/complete', JSON.stringify({
            uploadId: uploadId, parts: parts, filename: file.name, contentType: file.type,
          }), { 'Content-Type': 'application/json' });
        }).then(function () {
          statusEl.textContent = 'Uploaded — refreshing…';
          window.location.hash = 'residents';
          window.location.reload();
        }).catch(function (err) {
          statusEl.textContent = err.message || 'Upload failed — please try again.';
          btn.disabled = false;
          if (uploadId) {
            xhrRequest('POST', '/admin/residents/mpu/abort', JSON.stringify({ uploadId: uploadId }), { 'Content-Type': 'application/json' }).catch(function () {});
          }
        });
      });
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function handleAdminAction(request, env, url) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });

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
    if (m.hasVideo) await env.MEMORIES.delete(memoryVideoKey(id));
  } else {
    const m = JSON.parse(raw);
    m.status = action === 'approve' ? 'approved' : 'rejected';
    await env.ORDERS.put('mem_' + id, JSON.stringify(m));
  }

  return new Response(null, {
    status: 302,
    headers: { Location: '/admin#memories' },
  });
}

async function handleAdminNotify(request, env, url) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const fd = await request.formData();
  const title = (fd.get('title') || '').trim();
  const body  = (fd.get('body')  || '').trim();
  const link  = (fd.get('url')   || '/').trim();
  if (!title || !body) return new Response('Bad request', { status: 400 });

  const result = await sendPushToAll(env, { title, body, url: link });

  return new Response(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="2;url=/admin"><style>body{font-family:-apple-system,sans-serif;max-width:520px;margin:48px auto;padding:24px;text-align:center;background:#f5f5f7}h1{color:#3a7d32}p{color:#6e6e73}</style></head><body><h1>Sent</h1><p>Delivered ${result.sent} / ${result.total}. ${result.failed ? result.failed + ' failed.' : ''}</p><p><a href="/admin">Back to admin</a></p></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

async function handleAdminSchedule(request, env, url) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const fd = await request.formData();
  const action = fd.get('action');

  if (action === 'delete') {
    const id = fd.get('id');
    if (id) await env.ORDERS.delete(id);
  } else if (action === 'toggle') {
    const id = fd.get('id');
    if (id) {
      const raw = await env.ORDERS.get(id);
      if (raw) {
        const s = JSON.parse(raw);
        s.enabled = !s.enabled;
        await env.ORDERS.put(id, JSON.stringify(s));
      }
    }
  } else if (action === 'fire') {
    const id = fd.get('id');
    if (id) {
      const raw = await env.ORDERS.get(id);
      if (raw) {
        const s = JSON.parse(raw);
        let title = s.title, body = s.body, link = s.url || '/';
        if (s.dynamic === 'zmanim') {
          const z = await fetchShabbosZmanim();
          if (z) body = `Candle lighting ${z.candles}${z.havdalah ? ', Havdalah ' + z.havdalah : ''}.`;
        } else if (s.dynamic === 'weather') {
          const w = await fetchWeatherAlert();
          if (w.alert) {
            body = w.alert;
            if (w.title) title = w.title;
          } else {
            body = '(No alert right now — test fire) ' + body;
          }
        }
        await sendPushToAll(env, { title, body, url: link });
        s.lastFired = new Date().toISOString();
        await env.ORDERS.put(id, JSON.stringify(s));
      }
    }
  } else if (action === 'save') {
    const id = fd.get('id') || ('sched_' + Date.now() + Math.random().toString(36).slice(2, 6));
    const type = fd.get('type') || 'weekly';
    const sched = {
      id,
      title: (fd.get('title') || '').trim(),
      body:  (fd.get('body')  || '').trim(),
      url:   (fd.get('url')   || '/').trim(),
      schedule: {},
      dynamic: (fd.get('dynamic') || '').trim() || null,
      enabled: fd.get('enabled') === 'on',
      lastFired: null,
      created: new Date().toISOString(),
    };

    // Preserve created/lastFired on edit
    const existing = await env.ORDERS.get(id);
    if (existing) {
      const prev = JSON.parse(existing);
      sched.created = prev.created || sched.created;
      sched.lastFired = prev.lastFired || null;
    }

    if (type === 'weekly') {
      const days = [];
      DAY_NAMES.forEach(d => { if (fd.get('day_' + d) === 'on') days.push(d); });
      sched.schedule = {
        type: 'weekly',
        days,
        time: (fd.get('time') || '09:00'),
      };
    } else if (type === 'once') {
      sched.schedule = {
        type: 'once',
        datetime: (fd.get('datetime') || ''),
      };
    }

    if (!sched.title || !sched.body) return new Response('Bad request: title + body required', { status: 400 });

    await env.ORDERS.put(id, JSON.stringify(sched));
  }

  return new Response(null, {
    status: 302,
    headers: { Location: '/admin#notifications' },
  });
}

// ── Gazette ─────────────────────────────────────────────────────────────────
// Uploads go through R2's multipart upload API, same as Magazines (see that
// section for why) — Gazette issues routinely exceed Cloudflare's ~100MB edge
// request-size limit too (hit with a real 110MB issue), so this is no longer
// a single request body at all.

// Sanity ceiling only — R2 multipart supports far more than this. Not a
// platform limit like the old single-shot cap was.
const MAX_GAZETTE_BYTES = 500 * 1024 * 1024;

function gazetteKey(id) {
  return 'gazette/' + id + '.pdf';
}

async function handleAdminGazette(request, env, url) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const fd = await request.formData();
  const action = fd.get('action') || 'delete';
  if (action !== 'delete') return new Response('Unsupported action', { status: 400 });

  const id = fd.get('id');
  if (id) {
    await env.MEMORIES.delete(gazetteKey(id));
    await env.MEMORIES.delete('gazette/' + id + '.jpg');
    await env.ORDERS.delete('gazette_' + id);
  }
  return new Response(null, { status: 302, headers: { Location: '/admin#gazette' } });
}

async function handleGazetteMpuStart(request, env) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
  const filename = (body.filename || 'issue.pdf').toString();
  const fileSize = Number(body.fileSize) || 0;
  const issue = (body.issueDate || '').toString().trim();

  if (!filename.toLowerCase().endsWith('.pdf')) return new Response('Must be a PDF', { status: 400 });
  if (fileSize <= 0) return new Response('Empty file', { status: 400 });
  if (fileSize > MAX_GAZETTE_BYTES) return new Response('PDF must be under 500MB', { status: 400 });
  if (!issue) return new Response('Issue date required', { status: 400 });

  const id = issue.replace(/-/g, '') + '_' + Math.random().toString(36).slice(2, 6);

  const upload = await env.MEMORIES.createMultipartUpload(gazetteKey(id), {
    httpMetadata: {
      contentType: 'application/pdf',
      contentDisposition: 'inline; filename="' + filename.replace(/[^a-zA-Z0-9._-]/g, '_') + '"',
    },
  });

  return json({ uploadId: upload.uploadId, id });
}

async function handleGazetteMpuPart(request, env, url) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const id = url.searchParams.get('id') || '';
  const uploadId = url.searchParams.get('uploadId') || '';
  const partNumber = parseInt(url.searchParams.get('partNumber') || '0', 10);
  if (!id || !uploadId || !partNumber) return new Response('Bad request', { status: 400 });

  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return new Response('Empty part', { status: 400 });

  const upload = env.MEMORIES.resumeMultipartUpload(gazetteKey(id), uploadId);
  try {
    const part = await upload.uploadPart(partNumber, buf);
    return json({ partNumber: part.partNumber, etag: part.etag });
  } catch (err) {
    return new Response('Part upload failed: ' + (err && err.message || err), { status: 500 });
  }
}

async function handleGazetteMpuComplete(request, env) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
  const id = (body.id || '').toString().trim();
  const uploadId = (body.uploadId || '').toString().trim();
  const parts = Array.isArray(body.parts) ? body.parts : [];
  const filename = (body.filename || 'issue.pdf').toString();
  const title = (body.title || '').toString().trim();
  const parsha = (body.parsha || '').toString().trim();
  const issue = (body.issueDate || '').toString().trim();
  if (!id || !uploadId || !parts.length || !issue) return new Response('Bad request', { status: 400 });

  const upload = env.MEMORIES.resumeMultipartUpload(gazetteKey(id), uploadId);
  try {
    await upload.complete(parts.map(p => ({ partNumber: p.partNumber, etag: p.etag })));
  } catch (err) {
    return new Response('Could not finalize upload: ' + (err && err.message || err), { status: 500 });
  }

  await env.ORDERS.put('gazette_' + id, JSON.stringify({
    id,
    title: title || ('GTA Gazette' + (parsha ? ' — ' + parsha : '')),
    parsha,
    issueDate: issue,
    filename,
    uploadedAt: new Date().toISOString(),
  }));

  return json({ success: true, id });
}

async function handleGazetteMpuAbort(request, env) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
  const id = (body.id || '').toString().trim();
  const uploadId = (body.uploadId || '').toString().trim();
  if (!id || !uploadId) return new Response('Bad request', { status: 400 });

  const upload = env.MEMORIES.resumeMultipartUpload(gazetteKey(id), uploadId);
  try { await upload.abort(); } catch { /* best effort — unknown/already-completed upload is fine to ignore */ }

  return json({ success: true });
}

// Cover thumbnail is rendered client-side (page 1 of the PDF, via pdf.js) and
// uploaded separately from the (now chunked) PDF itself — it's always small,
// so a single plain request is fine; best effort, the archive falls back to a
// plain card if it's missing so a render failure never blocks the upload.
async function handleGazetteThumbnailUpload(request, env, url) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const id = url.searchParams.get('id') || '';
  if (!id) return new Response('Bad request', { status: 400 });

  const buf = await request.arrayBuffer();
  if (buf.byteLength) {
    await env.MEMORIES.put('gazette/' + id + '.jpg', buf, {
      httpMetadata: { contentType: 'image/jpeg' },
    });
  }

  return json({ success: true });
}

async function handleGazettePdf(env, id) {
  const obj = await env.MEMORIES.get(gazetteKey(id));
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'public, max-age=86400',
      'Content-Disposition': obj.httpMetadata?.contentDisposition || 'inline',
    },
  });
}

async function handleGazetteThumb(env, id) {
  const obj = await env.MEMORIES.get('gazette/' + id + '.jpg');
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

async function handleGazetteData(env) {
  const list = await env.ORDERS.list({ prefix: 'gazette_' });
  if (!list.keys.length) return json({ issues: [] });
  const all = await Promise.all(
    list.keys.map(k => env.ORDERS.get(k.name).then(v => JSON.parse(v)))
  );
  all.sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''));
  return json({ issues: all });
}

async function listGazettes(env) {
  const list = await env.ORDERS.list({ prefix: 'gazette_' });
  if (!list.keys.length) return [];
  const all = await Promise.all(
    list.keys.map(k => env.ORDERS.get(k.name).then(v => JSON.parse(v)))
  );
  all.sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''));
  return all;
}

// ── Magazines (Country Vues, Viderkol — self-hosted PDFs) ────────────────────
// Unlike the Gazette, no archive: each slug holds exactly one "current issue"
// PDF that the admin replaces weekly, matching how the old flipdocs/FlippingBook
// embeds always just showed whatever was most recently published.
//
// Uploads go through R2's multipart upload API (not a single PUT/POST body) —
// magazine issues routinely exceed Cloudflare's ~100MB edge request-size limit
// (a 413 there happens before the Worker even runs, so no amount of code here
// can raise it). The browser slices the file into chunks well under that limit
// and this Worker relays each chunk to R2 as a part; no S3 API credentials are
// needed since R2's multipart API is exposed directly on the bucket binding.

const MAGAZINES = {
  vues: { title: 'Country Vues' },
  viderkol: { title: 'Viderkol' },
  nekudatovah: { title: 'Nekuda Tovah' },
};

const MAX_MAGAZINE_BYTES = 500 * 1024 * 1024;

function magazineKey(slug) {
  return 'magazine/' + slug + '.pdf';
}

async function handleAdminMagazines(request, env, url) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const fd = await request.formData();
  const slug = (fd.get('slug') || '').trim();
  if (!MAGAZINES[slug]) return new Response('Unknown magazine', { status: 400 });

  const action = fd.get('action') || 'delete';
  if (action !== 'delete') return new Response('Unsupported action', { status: 400 });

  await env.MEMORIES.delete(magazineKey(slug));
  await env.ORDERS.delete('magazine_' + slug);
  return new Response(null, { status: 302, headers: { Location: '/admin#magazines' } });
}

async function handleMagazineMpuStart(request, env) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
  const slug = (body.slug || '').toString().trim();
  if (!MAGAZINES[slug]) return new Response('Unknown magazine', { status: 400 });
  const filename = (body.filename || 'issue.pdf').toString();
  const fileSize = Number(body.fileSize) || 0;

  if (!filename.toLowerCase().endsWith('.pdf')) return new Response('Must be a PDF', { status: 400 });
  if (fileSize <= 0) return new Response('Empty file', { status: 400 });
  if (fileSize > MAX_MAGAZINE_BYTES) return new Response('PDF must be under 500MB', { status: 400 });

  const upload = await env.MEMORIES.createMultipartUpload(magazineKey(slug), {
    httpMetadata: {
      contentType: 'application/pdf',
      contentDisposition: 'inline; filename="' + filename.replace(/[^a-zA-Z0-9._-]/g, '_') + '"',
    },
  });

  return json({ uploadId: upload.uploadId });
}

async function handleMagazineMpuPart(request, env, url) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const slug = url.searchParams.get('slug') || '';
  const uploadId = url.searchParams.get('uploadId') || '';
  const partNumber = parseInt(url.searchParams.get('partNumber') || '0', 10);
  if (!MAGAZINES[slug] || !uploadId || !partNumber) return new Response('Bad request', { status: 400 });

  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return new Response('Empty part', { status: 400 });

  const upload = env.MEMORIES.resumeMultipartUpload(magazineKey(slug), uploadId);
  try {
    const part = await upload.uploadPart(partNumber, buf);
    return json({ partNumber: part.partNumber, etag: part.etag });
  } catch (err) {
    return new Response('Part upload failed: ' + (err && err.message || err), { status: 500 });
  }
}

async function handleMagazineMpuComplete(request, env) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
  const slug = (body.slug || '').toString().trim();
  const uploadId = (body.uploadId || '').toString().trim();
  const parts = Array.isArray(body.parts) ? body.parts : [];
  const filename = (body.filename || 'issue.pdf').toString();
  if (!MAGAZINES[slug] || !uploadId || !parts.length) return new Response('Bad request', { status: 400 });

  const upload = env.MEMORIES.resumeMultipartUpload(magazineKey(slug), uploadId);
  try {
    await upload.complete(parts.map(p => ({ partNumber: p.partNumber, etag: p.etag })));
  } catch (err) {
    return new Response('Could not finalize upload: ' + (err && err.message || err), { status: 500 });
  }

  await env.ORDERS.put('magazine_' + slug, JSON.stringify({
    slug,
    filename,
    uploadedAt: new Date().toISOString(),
  }));

  return json({ success: true });
}

async function handleMagazineMpuAbort(request, env) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
  const slug = (body.slug || '').toString().trim();
  const uploadId = (body.uploadId || '').toString().trim();
  if (!MAGAZINES[slug] || !uploadId) return new Response('Bad request', { status: 400 });

  const upload = env.MEMORIES.resumeMultipartUpload(magazineKey(slug), uploadId);
  try { await upload.abort(); } catch { /* best effort — an already-completed or unknown upload is fine to ignore */ }

  return json({ success: true });
}

async function handleMagazinePdf(env, slug) {
  if (!MAGAZINES[slug]) return new Response('Not found', { status: 404 });
  const obj = await env.MEMORIES.get(magazineKey(slug));
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/pdf',
      // Short-lived — this URL is stable but its content is replaced weekly.
      'Cache-Control': 'public, max-age=300',
      'Content-Disposition': obj.httpMetadata?.contentDisposition || 'inline',
    },
  });
}

async function listMagazines(env) {
  const slugs = Object.keys(MAGAZINES);
  return Promise.all(slugs.map(async slug => {
    const raw = await env.ORDERS.get('magazine_' + slug);
    return raw ? JSON.parse(raw) : { slug, filename: null, uploadedAt: null };
  }));
}

async function handleMagazinesData(env) {
  return json({ magazines: await listMagazines(env) });
}

// ── Colony Updates (WhatsApp forwards via iOS Shortcut) ─────────────────────
// Posted through a bearer-style X-Api-Key header, not the admin session cookie
// — a Shortcut has no cookie jar, and a scoped key can be rotated on its own
// without touching ADMIN_PASSWORD_HASH/SESSION_SECRET if the phone is lost.
// No moderation queue: only the key holder can post, so items publish immediately.

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

async function handleUpdates(request, env, url) {
  const mediaMatch = url.pathname.match(/^\/updates\/([^/]+)\/media$/);
  if (request.method === 'GET' && mediaMatch) {
    const obj = await env.MEMORIES.get('update_' + mediaMatch[1]);
    if (!obj) return new Response('Not found', { status: 404 });
    return new Response(obj.body, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  if (request.method !== 'POST' || url.pathname !== '/updates') {
    return new Response('Not found', { status: 404 });
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rlKey = 'updates_auth_fail_' + ip;
  const failCount = parseInt((await env.ORDERS.get(rlKey)) || '0', 10);
  if (failCount >= 8) {
    return json({ success: false, error: 'Too many attempts — try again in a few minutes.' }, 429);
  }

  const provided = request.headers.get('X-Api-Key') || '';
  const expected = env.UPDATES_API_KEY || '';
  let keyOk = expected.length > 0 && provided.length === expected.length;
  if (keyOk) {
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
    keyOk = diff === 0;
  }
  if (!keyOk) {
    await env.ORDERS.put(rlKey, String(failCount + 1), { expirationTtl: 600 });
    return json({ success: false, error: 'Unauthorized' }, 401);
  }
  await env.ORDERS.delete(rlKey);

  // iOS Shortcuts' per-field "File" picker in a multipart Form body proved
  // unreliable in practice — so a photo/video post can also arrive as a raw
  // request body whose Content-Type is the media's own MIME type, with the
  // caption passed as a ?text= query param instead of a form field. This is
  // Shortcuts' "Request Body: File" mode, which uses a plain, reliable value
  // picker rather than the nested Form-field one.
  const contentType = (request.headers.get('Content-Type') || '').split(';')[0].trim();
  const isRawMedia = ALLOWED_PHOTO_TYPES.includes(contentType) || ALLOWED_VIDEO_TYPES.includes(contentType);

  let text = '';
  let mediaType = 'none';
  let mediaContentType = null;
  let mediaBytes = null;

  if (isRawMedia) {
    text = (url.searchParams.get('text') || '').trim();
    mediaType = ALLOWED_PHOTO_TYPES.includes(contentType) ? 'image' : 'video';
    mediaContentType = contentType;
    mediaBytes = await request.arrayBuffer();
    if (!mediaBytes.byteLength) {
      return json({ success: false, error: 'Empty file' }, 400);
    }
    const maxBytes = mediaType === 'image' ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
    if (mediaBytes.byteLength > maxBytes) {
      return json({ success: false, error: 'File too large' }, 400);
    }
  } else {
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return json({ success: false, error: 'Invalid form data' }, 400);
    }

    // iOS Shortcuts auto-capitalizes the first letter of a Form field's key
    // when you type it in — accept both casings rather than fight that.
    text = (formData.get('text') || formData.get('Text') || '').toString().trim();
    const media = formData.get('media') || formData.get('Media');
    const hasMedia = media && typeof media !== 'string' && media.size > 0;

    if (!text && !hasMedia) {
      return json({ success: false, error: 'Nothing to post' }, 400);
    }

    if (hasMedia) {
      if (ALLOWED_PHOTO_TYPES.includes(media.type)) {
        mediaType = 'image';
      } else if (ALLOWED_VIDEO_TYPES.includes(media.type)) {
        mediaType = 'video';
      } else {
        return json({ success: false, error: 'Unsupported media type' }, 400);
      }
      const maxBytes = mediaType === 'image' ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
      if (media.size > maxBytes) {
        return json({ success: false, error: 'File too large' }, 400);
      }
      mediaContentType = media.type;
      mediaBytes = await media.arrayBuffer();
    }
  }

  if (!text && mediaType === 'none') {
    return json({ success: false, error: 'Nothing to post' }, 400);
  }

  const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);

  if (mediaBytes) {
    await env.MEMORIES.put('update_' + id, mediaBytes, {
      httpMetadata: { contentType: mediaContentType },
    });
  }

  await env.ORDERS.put('update_' + id, JSON.stringify({
    id,
    text,
    mediaType,
    mediaContentType,
    timestamp: new Date().toISOString(),
  }));

  return json({ success: true, id });
}

async function handleUpdatesData(env) {
  const list = await env.ORDERS.list({ prefix: 'update_' });
  if (!list.keys.length) return json({ updates: [] });
  const all = await Promise.all(
    list.keys.map(k => env.ORDERS.get(k.name).then(v => JSON.parse(v)))
  );
  all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return json({ updates: all.slice(0, 20) });
}

async function listUpdates(env) {
  const list = await env.ORDERS.list({ prefix: 'update_' });
  if (!list.keys.length) return [];
  const all = await Promise.all(
    list.keys.map(k => env.ORDERS.get(k.name).then(v => JSON.parse(v)))
  );
  all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return all;
}

async function handleAdminUpdates(request, env, url) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const fd = await request.formData();
  const action = fd.get('action');
  const id = fd.get('id');

  if (action === 'delete' && id) {
    const raw = await env.ORDERS.get('update_' + id);
    if (raw) {
      const u = JSON.parse(raw);
      await env.ORDERS.delete('update_' + id);
      if (u.mediaType !== 'none') await env.MEMORIES.delete('update_' + id);
    }
  }

  return new Response(null, { status: 302, headers: { Location: '/admin#updates' } });
}

// ── Push subscriptions ──────────────────────────────────────────────────────

function endpointToKey(endpoint) {
  const b = new TextEncoder().encode(endpoint);
  let s = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return 'push_sub_' + s.slice(-60);
}

async function handleAdminPushVerify(request, env, url) {
  if (!(await isAuthed(request, env))) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const result = await sendPushToAll(env, {
    title: '✅ Notifications working',
    body: 'You are subscribed to GTA updates.',
    url: '/local.html',
  });
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="3;url=/admin"><style>body{font-family:-apple-system,sans-serif;max-width:520px;margin:48px auto;padding:24px;text-align:center;background:#f5f5f7}h1{color:#3a7d32}p{color:#6e6e73}strong{color:#1d1d1f}</style></head><body><h1>Verified</h1><p><strong>${result.sent} live</strong> subscriber${result.sent === 1 ? '' : 's'} pinged.</p><p>Removed <strong>${result.failed} dead</strong> subscription${result.failed === 1 ? '' : 's'}.</p><p>Accurate count: <strong>${result.sent}</strong></p><p><a href="/admin">Back to admin</a></p></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
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
  await env.ORDERS.put('push_meta', JSON.stringify({
    lastVerified: new Date().toISOString(),
    liveCount: sent,
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

// ── Scheduled jobs (KV-driven) ──────────────────────────────────────────────

const DAY_NAMES = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function nyNow() {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: 'numeric', minute: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const obj = {};
  parts.forEach(p => obj[p.type] = p.value);
  const dayMap = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  return {
    weekday: dayMap[obj.weekday],
    weekdayName: DAY_NAMES[dayMap[obj.weekday]],
    hour: parseInt(obj.hour, 10) === 24 ? 0 : parseInt(obj.hour, 10),
    minute: parseInt(obj.minute, 10),
    iso: `${obj.year}-${obj.month}-${obj.day}T${String(obj.hour).padStart(2,'0')}:${obj.minute}`,
  };
}

const DEFAULT_SCHEDULES = [
  {
    id: 'sched_default_pool_close',
    title: 'Pool closes at 6pm',
    body: 'Pool closing today for Shabbos at 6pm. Enjoy the rest of your swim!',
    url: '/local.html',
    schedule: { type: 'weekly', days: ['FRI'], time: '15:00' },
    dynamic: null,
    enabled: true,
    lastFired: null,
    created: new Date().toISOString(),
  },
  {
    id: 'sched_default_pool_open',
    title: 'Pool opens at 10am',
    body: 'Pool opens at 10am today. See you there!',
    url: '/local.html',
    schedule: { type: 'weekly', days: ['SUN'], time: '10:00' },
    dynamic: null,
    enabled: true,
    lastFired: null,
    created: new Date().toISOString(),
  },
  {
    id: 'sched_default_shabbos_zmanim',
    title: 'Shabbos Zmanim',
    body: 'Candle lighting today. See zmanim for details.',
    url: '/zmanim.html',
    schedule: { type: 'weekly', days: ['FRI'], time: '09:00' },
    dynamic: 'zmanim',
    enabled: true,
    lastFired: null,
    created: new Date().toISOString(),
  },
  {
    id: 'sched_default_weather',
    title: '⚠️ Weather Alert',
    body: 'Severe weather expected today.',
    url: '/local.html',
    schedule: { type: 'weekly', days: ['SUN','MON','TUE','WED','THU','FRI','SAT'], time: '10:00' },
    dynamic: 'weather',
    enabled: true,
    lastFired: null,
    created: new Date().toISOString(),
  },
];

async function listSchedules(env) {
  const list = await env.ORDERS.list({ prefix: 'sched_' });
  if (!list.keys.length) return [];
  const all = await Promise.all(
    list.keys.map(k => env.ORDERS.get(k.name).then(v => JSON.parse(v)))
  );
  all.sort((a, b) => (a.created || '').localeCompare(b.created || ''));
  return all;
}

async function seedDefaultsIfEmpty(env) {
  const list = await env.ORDERS.list({ prefix: 'sched_', limit: 1 });
  if (list.keys.length) return;
  await Promise.all(DEFAULT_SCHEDULES.map(s =>
    env.ORDERS.put(s.id, JSON.stringify(s))
  ));
}

// Pool changeover heads-up: ~15 min before each gender switch / close.
// Cron is */15 so scheduled time at :15 or :45 fires that exact tick.
const POOL_CHANGEOVERS = [
  // Sunday (10-12:30 L, 12:30-3 M, 3-5 L, 5-6:30 M)
  ['sun_1215', ['SUN'], '12:15', 'Pool switches in 15 min', "Men's swim starts at 12:30pm"],
  ['sun_1445', ['SUN'], '14:45', 'Pool switches in 15 min', "Ladies' swim starts at 3:00pm"],
  ['sun_1645', ['SUN'], '16:45', 'Pool switches in 15 min', "Men's swim starts at 5:00pm"],
  ['sun_1815', ['SUN'], '18:15', 'Pool closing soon',       'Pool closes at 6:30pm'],
  // Mon-Thu (10-12:30 L, 12:30-1:30 M, 1:30-5:15 L, 5:15-6:15 M)
  ['wd_1215',  ['MON','TUE','WED','THU'], '12:15', 'Pool switches in 15 min', "Men's swim starts at 12:30pm"],
  ['wd_1315',  ['MON','TUE','WED','THU'], '13:15', 'Pool switches in 15 min', "Ladies' swim starts at 1:30pm"],
  ['wd_1700',  ['MON','TUE','WED','THU'], '17:00', 'Pool switches in 15 min', "Men's swim starts at 5:15pm"],
  ['wd_1800',  ['MON','TUE','WED','THU'], '18:00', 'Pool closing soon',       'Pool closes at 6:15pm'],
  // Friday (10-12 L, 12-1:30 M, 1:30-4 L, 4-6 M)
  ['fri_1145', ['FRI'], '11:45', 'Pool switches in 15 min', "Men's swim starts at 12:00pm"],
  ['fri_1315', ['FRI'], '13:15', 'Pool switches in 15 min', "Ladies' swim starts at 1:30pm"],
  ['fri_1545', ['FRI'], '15:45', 'Pool switches in 15 min', "Men's swim starts at 4:00pm"],
  ['fri_1745', ['FRI'], '17:45', 'Pool closing for Shabbos', 'Pool closes at 6:00pm for Shabbos'],
];

async function seedPoolChangeoversIfMissing(env) {
  await Promise.all(POOL_CHANGEOVERS.map(async ([slug, days, time, title, body]) => {
    const id = 'sched_pool_' + slug;
    const existing = await env.ORDERS.get(id);
    if (existing) return;
    const sched = {
      id, title, body,
      url: '/local.html',
      schedule: { type: 'weekly', days, time },
      dynamic: null,
      enabled: true,
      lastFired: null,
      created: new Date().toISOString(),
    };
    await env.ORDERS.put(id, JSON.stringify(sched));
  }));
}

function scheduleMatches(sched, now) {
  const s = sched.schedule || {};
  if (s.type === 'weekly') {
    const days = (s.days || []);
    if (!days.includes(now.weekdayName)) return false;
    const [h, m] = (s.time || '00:00').split(':').map(n => parseInt(n, 10));
    // Match if scheduled time is within current 15-min cron window: [hh:mm, hh:mm+15)
    if (now.hour !== h) return false;
    if (now.minute < m || now.minute >= m + 15) return false;
    return true;
  }
  if (s.type === 'once') {
    if (!s.datetime) return false;
    // datetime is ET local "YYYY-MM-DDTHH:MM"
    const schedIso = s.datetime;
    const nowIso = now.iso;
    if (schedIso > nowIso) return false;
    // Within 15 min after scheduled
    const schedTs = nyLocalIsoToUTC(schedIso);
    const nowTs = nyLocalIsoToUTC(nowIso);
    if (nowTs - schedTs > 15 * 60 * 1000) return false;
    return true;
  }
  return false;
}

function nyLocalIsoToUTC(iso) {
  // iso = "YYYY-MM-DDTHH:MM" in ET; convert to UTC ms
  // Approximate: treat as UTC then subtract -240 min (EDT). Good enough for window check.
  const d = new Date(iso + ':00Z');
  return d.getTime() + 4 * 60 * 60 * 1000;
}

function addDaysToDateStr(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

// Friday noon teaser + Saturday 10pm reminder for that week's entertainment.
// Cron is */15, so the :00-:14 window at each fixed hour fires exactly once.
async function checkEntertainmentAlertsAndNotify(env) {
  const now = nyNow();
  const today = now.iso.slice(0, 10);

  if (now.weekdayName === 'FRI' && now.hour === 12 && now.minute < 15) {
    const saturday = addDaysToDateStr(today, 1);
    const entry = ENTERTAINMENT_LINEUP.find(e => e.date === saturday);
    if (entry && !entry.noEntertainment) {
      const flagKey = 'ent_alert_' + saturday + '_fri';
      if (!(await env.ORDERS.get(flagKey))) {
        await sendPushToAll(env, {
          title: 'This Saturday Night 🎉',
          body: entry.emoji + ' ' + entry.title + (entry.time ? ' at ' + entry.time : ''),
          url: '/entertainment.html',
        });
        await env.ORDERS.put(flagKey, '1');
      }
    }
  }

  if (now.weekdayName === 'SAT' && now.hour === 22 && now.minute < 15) {
    const entry = ENTERTAINMENT_LINEUP.find(e => e.date === today);
    if (entry && !entry.noEntertainment) {
      const flagKey = 'ent_alert_' + today + '_sat';
      if (!(await env.ORDERS.get(flagKey))) {
        await sendPushToAll(env, {
          title: 'Tonight! 🌟',
          body: entry.title + (entry.time ? ' starts at ' + entry.time : ''),
          url: '/entertainment.html',
        });
        await env.ORDERS.put(flagKey, '1');
      }
    }
  }
}

async function runScheduledTick(env) {
  await seedDefaultsIfEmpty(env);
  await seedPoolChangeoversIfMissing(env);
  await checkNewVideoAndNotify(env);
  await checkEntertainmentAlertsAndNotify(env);
  const now = nyNow();
  const scheds = await listSchedules(env);

  for (const sched of scheds) {
    if (!sched.enabled) continue;
    if (!scheduleMatches(sched, now)) continue;
    // Debounce: skip if fired in last 25 min
    if (sched.lastFired) {
      const lastMs = Date.parse(sched.lastFired);
      if (!isNaN(lastMs) && Date.now() - lastMs < 25 * 60 * 1000) continue;
    }

    let title = sched.title;
    let body  = sched.body;
    let url   = sched.url || '/';

    if (sched.dynamic === 'zmanim') {
      const z = await fetchShabbosZmanim();
      if (z) {
        body = `Candle lighting ${z.candles}${z.havdalah ? ', Havdalah ' + z.havdalah : ''}.`;
      }
    } else if (sched.dynamic === 'weather') {
      const w = await fetchWeatherAlert();
      if (!w.alert) continue; // skip if no alert
      body = w.alert;
      if (w.title) title = w.title;
    }

    await sendPushToAll(env, { title, body, url });

    // Mark fired + delete one-time entries after firing
    if (sched.schedule.type === 'once') {
      await env.ORDERS.delete(sched.id);
    } else {
      sched.lastFired = new Date().toISOString();
      await env.ORDERS.put(sched.id, JSON.stringify(sched));
    }
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

// ── Contact form view tracking ──────────────────────────────────────────────

async function handleContactView(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const ip      = request.headers.get('cf-connecting-ip') || '';
  const country = request.headers.get('cf-ipcountry') || '';
  const ua      = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';

  // Reverse timestamp so KV list sorts newest first
  const ts = Date.now();
  const key = 'cv_' + (9999999999999 - ts) + '_' + Math.random().toString(36).slice(2, 6);

  await env.ORDERS.put(key, JSON.stringify({
    ts: new Date(ts).toISOString(),
    ip, country, ua, referer,
  }), { expirationTtl: 60 * 60 * 24 * 90 }); // 90 days

  return json({ ok: true });
}

async function listContactViews(env, limit) {
  const list = await env.ORDERS.list({ prefix: 'cv_', limit: limit || 100 });
  if (!list.keys.length) return [];
  const all = await Promise.all(
    list.keys.map(k => env.ORDERS.get(k.name).then(v => JSON.parse(v)))
  );
  return all;
}

async function handleContactSubmit(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const ip      = request.headers.get('cf-connecting-ip') || '';
  const country = request.headers.get('cf-ipcountry') || '';
  const ua      = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';

  let name = '', email = '', phone = '', message = '';
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const b = await request.json();
      name = (b.name || '').toString();
      email = (b.email || b.emailaddress || '').toString();
      phone = (b.phone || '').toString();
      message = (b.message || '').toString();
    } else {
      const fd = await request.formData();
      name = (fd.get('name') || '').toString();
      email = (fd.get('email') || fd.get('emailaddress') || '').toString();
      phone = (fd.get('phone') || '').toString();
      message = (fd.get('message') || '').toString();
    }
  } catch {}

  const ts = Date.now();
  const key = 'cs_' + (9999999999999 - ts) + '_' + Math.random().toString(36).slice(2, 6);
  await env.ORDERS.put(key, JSON.stringify({
    ts: new Date(ts).toISOString(),
    ip, country, ua, referer, name, email, phone, message,
  }), { expirationTtl: 60 * 60 * 24 * 365 }); // 1 year

  return json({ ok: true });
}

async function listContactSubmits(env, limit) {
  const list = await env.ORDERS.list({ prefix: 'cs_', limit: limit || 100 });
  if (!list.keys.length) return [];
  return Promise.all(
    list.keys.map(k => env.ORDERS.get(k.name).then(v => JSON.parse(v)))
  );
}

// ── Saturday Night Entertainment ────────────────────────────────────────────

const ENTERTAINMENT_LINEUP = [
  { date: '2026-06-27', emoji: '🌟', title: 'Opening Weekend' },
  { date: '2026-07-04', emoji: '🧠', title: 'Mentalist David Levitan', time: '11:00 PM',
    link: 'https://davidlevitan.com/', linkLabel: 'Visit website' },
  { date: '2026-07-11', title: 'No Entertainment This Week', noEntertainment: true },
  { date: '2026-07-18', emoji: '🎶', title: 'Melave Malka' },
  { date: '2026-07-25', emoji: '🎸', title: 'Nachamu with Eli Levin', time: '11:00 PM',
    link: 'https://www.instagram.com/elilevinmusic/', linkLabel: 'Follow on Instagram' },
  { date: '2026-08-01', emoji: '🎨', title: 'Resin Art with Lisa', time: '11:00 PM',
    link: 'https://www.instagram.com/resinartbylisa', linkLabel: 'Follow on Instagram' },
  { date: '2026-08-08', emoji: '🎤', title: 'Dovi Neuberger', time: '11:00 PM',
    link: 'https://www.instagram.com/dovineuburger/', linkLabel: 'Follow on Instagram' },
  { date: '2026-08-15', emoji: '🎲', title: 'GTA Game Night', time: '11:00 PM' },
];

// ── YouTube channel feed ────────────────────────────────────────────────────

const YOUTUBE_CHANNEL_ID = 'UCfDFwcXj87z5vgIrjz64dxw';
// IDs of videos removed from channel that YouTube RSS still returns
const YOUTUBE_BLOCKLIST = new Set([
  'Yd5a2z6WuBU', // Naftali Blumenthal Havdalah Part 2 — deleted 2026-06-30
]);

async function fetchChannelVideos() {
  try {
    const res = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + YOUTUBE_CHANNEL_ID, {
      cf: { cacheTtl: 600, cacheEverything: true },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const videos = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let m;
    while ((m = entryRegex.exec(xml)) !== null) {
      const entry = m[1];
      const id        = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
      const title     = (entry.match(/<title>([^<]+)<\/title>/) || [])[1];
      const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1];
      if (id && !YOUTUBE_BLOCKLIST.has(id)) videos.push({
        id,
        title: (title || '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"'),
        published,
        thumbnail: 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg',
      });
    }
    return videos;
  } catch {
    return [];
  }
}

async function handleYoutubeVideos(env) {
  // Cache via KV for 30 min
  const cached = await env.ORDERS.get('youtube_cache');
  if (cached) {
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.t < 30 * 60 * 1000) {
      return json({ videos: parsed.v });
    }
  }
  const videos = await fetchChannelVideos();
  await env.ORDERS.put('youtube_cache', JSON.stringify({ t: Date.now(), v: videos }));
  return json({ videos });
}

async function checkNewVideoAndNotify(env) {
  const videos = await fetchChannelVideos();
  if (!videos.length) return;
  const latest = videos[0];
  const metaRaw = await env.ORDERS.get('youtube_meta');
  const meta = metaRaw ? JSON.parse(metaRaw) : { lastVideoId: null };
  if (!meta.lastVideoId) {
    // First run — set baseline, no notification
    await env.ORDERS.put('youtube_meta', JSON.stringify({
      lastVideoId: latest.id,
      lastTitle: latest.title,
      lastChecked: new Date().toISOString(),
    }));
    return;
  }
  if (latest.id === meta.lastVideoId) {
    return;
  }
  await sendPushToAll(env, {
    title: '🎥 New colony video',
    body: latest.title,
    url: '/memories.html',
  });
  await env.ORDERS.put('youtube_meta', JSON.stringify({
    lastVideoId: latest.id,
    lastTitle: latest.title,
    lastChecked: new Date().toISOString(),
  }));
}

// ── Weather alerts (NWS official + Open-Meteo forecast extremes) ────────────

const NWS_USER_AGENT = 'GreentreeAcresWebsite (dslansky@gmail.com)';
const SEVERITY_RANK  = { 'Extreme': 4, 'Severe': 3, 'Moderate': 2, 'Minor': 1, 'Unknown': 0 };

function eventIcon(event) {
  const e = (event || '').toLowerCase();
  if (e.includes('tornado')) return '🌪️';
  if (e.includes('hurricane') || e.includes('tropical')) return '🌀';
  if (e.includes('flash flood')) return '🌊';
  if (e.includes('flood')) return '💧';
  if (e.includes('thunderstorm') || e.includes('severe')) return '⚡';
  if (e.includes('wind')) return '💨';
  if (e.includes('heat')) return '🔥';
  if (e.includes('winter') || e.includes('snow') || e.includes('blizzard') || e.includes('ice')) return '❄️';
  if (e.includes('fog')) return '🌫️';
  if (e.includes('air quality') || e.includes('smoke')) return '😷';
  return '⚠️';
}

async function fetchNWSAlerts() {
  try {
    const res = await fetch('https://api.weather.gov/alerts/active?point=41.7406,-74.7474', {
      headers: { 'User-Agent': NWS_USER_AGENT, 'Accept': 'application/geo+json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const features = data.features || [];
    const alerts = features
      .map(f => f.properties || {})
      .filter(p =>
        p.status === 'Actual' &&
        (SEVERITY_RANK[p.severity] || 0) >= SEVERITY_RANK['Moderate'] &&
        p.messageType !== 'Cancel'
      )
      .sort((a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0));
    return alerts;
  } catch {
    return [];
  }
}

async function fetchForecastExtremes() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=41.7406&longitude=-74.7474' +
      '&daily=weather_code,precipitation_probability_max,wind_gusts_10m_max,temperature_2m_max,uv_index_max' +
      '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=1';
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const code  = data.daily?.weather_code?.[0];
    const pop   = data.daily?.precipitation_probability_max?.[0] || 0;
    const gusts = data.daily?.wind_gusts_10m_max?.[0] || 0;
    const high  = data.daily?.temperature_2m_max?.[0] || 0;
    const uv    = data.daily?.uv_index_max?.[0] || 0;

    const out = [];
    if (code === 95 || code === 96 || code === 99) {
      out.push(`⚡ Thunderstorms expected today (${pop}% chance). Pool may close early — watch the sky.`);
    } else if (pop >= 80) {
      out.push(`🌧️ Heavy rain likely today (${pop}% chance). Pool may close early.`);
    }
    if (gusts >= 35) {
      out.push(`💨 High wind gusts up to ${Math.round(gusts)} mph today. Secure loose items.`);
    }
    if (high >= 95) {
      out.push(`🔥 Extreme heat today (high ${Math.round(high)}°F). Hydrate, limit sun exposure.`);
    } else if (high >= 90 && uv >= 8) {
      out.push(`☀️ Hot + high UV today (${Math.round(high)}°F, UV ${Math.round(uv)}). Sunscreen + hydrate.`);
    }
    return out;
  } catch {
    return [];
  }
}

function formatNWSAlert(a) {
  const icon = eventIcon(a.event);
  const event = a.event || 'Weather Alert';
  const headline = (a.headline || '').replace(/^[A-Z][a-z]+\s\d{1,2}\s+at\s+\d{1,2}:\d{2}[AP]M\s+\w+\sby\s+NWS\s+\w+\s+/i, '');
  // Try to grab a useful instruction snippet
  let instruction = (a.instruction || a.description || '').split('\n')[0];
  if (instruction.length > 140) instruction = instruction.slice(0, 137) + '…';
  return { icon, event, headline, instruction, severity: a.severity };
}

async function fetchWeatherAlert() {
  const [nwsAlerts, forecastExtremes] = await Promise.all([
    fetchNWSAlerts(),
    fetchForecastExtremes(),
  ]);

  if (nwsAlerts.length) {
    const top = formatNWSAlert(nwsAlerts[0]);
    const additionalCount = nwsAlerts.length - 1;
    const moreNote = additionalCount > 0 ? ` (+${additionalCount} more active alert${additionalCount === 1 ? '' : 's'})` : '';
    const titleLine = `${top.icon} ${top.event}${moreNote}`;
    const bodyParts = [];
    if (top.instruction) bodyParts.push(top.instruction);
    else if (top.headline) bodyParts.push(top.headline);
    // Attach a forecast extreme too if useful and different domain
    const relevantExtreme = forecastExtremes.find(f =>
      !f.toLowerCase().includes(top.event.toLowerCase().split(' ')[0])
    );
    if (relevantExtreme) bodyParts.push(relevantExtreme);
    return {
      title: titleLine,
      alert: bodyParts.join(' · ') || 'Check local weather alerts now.',
    };
  }

  if (forecastExtremes.length) {
    return {
      title: '⚠️ Weather Heads-Up',
      alert: forecastExtremes.join(' · '),
    };
  }

  return { alert: null };
}

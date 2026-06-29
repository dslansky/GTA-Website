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
    if (url.pathname === '/admin/schedule') {
      return handleAdminSchedule(request, env, url);
    }
    if (url.pathname === '/admin/gazette') {
      return handleAdminGazette(request, env, url);
    }
    if (url.pathname === '/gazette-data') {
      return handleGazetteData(env);
    }
    const gazPdfMatch = url.pathname.match(/^\/gazette\/([^/]+)\/pdf$/);
    if (gazPdfMatch) {
      return handleGazettePdf(env, gazPdfMatch[1]);
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
    const orderKeys = list.keys.filter(k => !k.name.startsWith('mem_') && !k.name.startsWith('push_sub_') && !k.name.startsWith('sched_') && !k.name.startsWith('gazette_'));
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

  await seedDefaultsIfEmpty(env);
  const schedules = await listSchedules(env);
  const editId = url.searchParams.get('edit') || '';
  const editing = editId ? schedules.find(s => s.id === editId) : null;

  const gazettes = await listGazettes(env);

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
        <a href="/admin?key=${key}&edit=${encodeURIComponent(s.id)}#sched-form" class="btn-mini">Edit</a>
        <form method="POST" action="/admin/schedule?key=${key}" style="display:inline;">
          <input type="hidden" name="action" value="toggle" />
          <input type="hidden" name="id" value="${esc(s.id)}" />
          <button class="btn-mini">${s.enabled ? 'Disable' : 'Enable'}</button>
        </form>
        <form method="POST" action="/admin/schedule?key=${key}" style="display:inline;" onsubmit="return confirm('Send this now to ${subCount} subscriber${subCount === 1 ? '' : 's'}?')">
          <input type="hidden" name="action" value="fire" />
          <input type="hidden" name="id" value="${esc(s.id)}" />
          <button class="btn-mini btn-fire">Fire now</button>
        </form>
        <form method="POST" action="/admin/schedule?key=${key}" style="display:inline;" onsubmit="return confirm('Delete schedule?')">
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
    body { font-family: -apple-system, sans-serif; max-width: 820px; margin: 0 auto; padding: 24px; background: #f5f5f7; }
    h1 { color: #1d1d1f; font-size: 1.5rem; margin-bottom: 4px; }
    .subtitle { color: #6e6e73; font-size: 0.875rem; margin-bottom: 32px; }
    h2 { color: #3a7d32; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 28px 0 12px; }
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
  <h1>GTA Admin</h1>
  <p class="subtitle">Memory moderation + push notifications. Orders export: <a href="/order?key=${key}">/order?key=${key}</a></p>

  <h2>Send Notification Now</h2>
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

  <a id="schedules"></a>
  <h2>Scheduled Notifications (${schedules.length})</h2>
  <div class="panel">
    ${schedules.length ? schedules.map(renderSched).join('') : '<p class="empty">No schedules yet.</p>'}
  </div>

  <a id="sched-form"></a>
  <h2>${editing ? 'Edit Schedule' : 'Add New Schedule'}</h2>
  <div class="panel">
    <form method="POST" action="/admin/schedule?key=${key}">
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
        <option value="zmanim" ${formDyn === 'zmanim' ? 'selected' : ''}>Live Shabbos zmanim (replaces body with candle lighting + havdalah)</option>
        <option value="weather" ${formDyn === 'weather' ? 'selected' : ''}>Live weather alert (only sends if storm/heavy rain forecast today)</option>
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
        ${editing ? `<a href="/admin?key=${key}#schedules" class="btn-mini" style="padding:10px 18px;">Cancel</a>` : ''}
      </div>
      <p style="margin-top:10px;font-size:0.75rem;color:#999;">Note: cron tick runs every 15 min. Schedule fires within 15 min of selected time.</p>
    </form>
  </div>

  <script>
    function setNotif(t, b, u) {
      document.getElementById('ntitle').value = t;
      document.getElementById('nbody').value = b;
      document.getElementById('nurl').value = u;
    }
  </script>

  <a id="gazette"></a>
  <h2>GTA Gazette (${gazettes.length} issue${gazettes.length === 1 ? '' : 's'})</h2>
  <div class="panel">
    <form method="POST" action="/admin/gazette?key=${key}" enctype="multipart/form-data">
      <input type="hidden" name="action" value="upload" />
      <label>Title (optional, auto-generated from parsha if blank)</label>
      <input name="title" type="text" maxlength="120" placeholder="e.g. GTA Gazette — Welcome Back Edition" />
      <label>Parsha</label>
      <input name="parsha" type="text" maxlength="80" placeholder="e.g. Chukas – Balak" />
      <label>Issue Date</label>
      <input name="issueDate" type="date" required value="${new Date().toISOString().slice(0,10)}" />
      <label>PDF File</label>
      <input name="pdf" type="file" accept="application/pdf,.pdf" required />
      <button type="submit">Upload Issue</button>
    </form>
  </div>

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
          <form method="POST" action="/admin/gazette?key=${key}" style="display:inline;" onsubmit="return confirm('Delete this issue?')">
            <input type="hidden" name="action" value="delete" />
            <input type="hidden" name="id" value="${esc(g.id)}" />
            <button class="btn-mini btn-del">Delete</button>
          </form>
        </div>
      </div>
    `).join('') : '<p class="empty">No issues uploaded yet.</p>'}
  </div>

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

async function handleAdminSchedule(request, env, url) {
  const key = url.searchParams.get('key');
  if (key !== ADMIN_KEY) return new Response('Unauthorized', { status: 401 });
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
    headers: { Location: '/admin?key=' + key + '#schedules' },
  });
}

// ── Gazette ─────────────────────────────────────────────────────────────────

const MAX_GAZETTE_BYTES = 30 * 1024 * 1024;

async function handleAdminGazette(request, env, url) {
  const key = url.searchParams.get('key');
  if (key !== ADMIN_KEY) return new Response('Unauthorized', { status: 401 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const fd = await request.formData();
  const action = fd.get('action') || 'upload';

  if (action === 'delete') {
    const id = fd.get('id');
    if (id) {
      await env.MEMORIES.delete('gazette/' + id + '.pdf');
      await env.ORDERS.delete('gazette_' + id);
    }
    return new Response(null, { status: 302, headers: { Location: '/admin?key=' + key + '#gazette' } });
  }

  // upload
  const title  = (fd.get('title')  || '').trim();
  const parsha = (fd.get('parsha') || '').trim();
  const issue  = (fd.get('issueDate') || '').trim(); // YYYY-MM-DD
  const file   = fd.get('pdf');

  if (!file || typeof file === 'string' || file.size === 0) {
    return new Response('PDF file required', { status: 400 });
  }
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return new Response('Must be a PDF', { status: 400 });
  }
  if (file.size > MAX_GAZETTE_BYTES) {
    return new Response('PDF must be under 30MB', { status: 400 });
  }
  if (!issue) {
    return new Response('Issue date required', { status: 400 });
  }

  const id = issue.replace(/-/g, '') + '_' + Math.random().toString(36).slice(2, 6);
  const buf = await file.arrayBuffer();

  await env.MEMORIES.put('gazette/' + id + '.pdf', buf, {
    httpMetadata: { contentType: 'application/pdf', contentDisposition: 'inline; filename="' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_') + '"' },
  });

  await env.ORDERS.put('gazette_' + id, JSON.stringify({
    id,
    title: title || ('GTA Gazette' + (parsha ? ' — ' + parsha : '')),
    parsha,
    issueDate: issue,
    filename: file.name,
    uploadedAt: new Date().toISOString(),
  }));

  return new Response(null, {
    status: 302,
    headers: { Location: '/admin?key=' + key + '#gazette' },
  });
}

async function handleGazettePdf(env, id) {
  const obj = await env.MEMORIES.get('gazette/' + id + '.pdf');
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'public, max-age=86400',
      'Content-Disposition': obj.httpMetadata?.contentDisposition || 'inline',
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

async function runScheduledTick(env) {
  await seedDefaultsIfEmpty(env);
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

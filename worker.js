export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/order') {
      return handleOrder(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function handleOrder(request, env) {
  const url = new URL(request.url);

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
    if (!list.keys.length) {
      return csv('id,timestamp,name,email,items,total\n');
    }

    const orders = await Promise.all(
      list.keys.map((k) => env.ORDERS.get(k.name).then((v) => JSON.parse(v)))
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

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!body.name || !body.email || !Array.isArray(body.items) || !body.items.length) {
      return new Response(JSON.stringify({ success: false, error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const id = Date.now().toString();
    const order = {
      id,
      timestamp: new Date().toISOString(),
      name: body.name,
      email: body.email,
      items: body.items,
      total: body.total,
    };

    await env.ORDERS.put(id, JSON.stringify(order));

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (key !== 'lobos2026') {
      return new Response('Unauthorized', { status: 401 });
    }

    const list = await env.ORDERS.list();
    if (!list.keys.length) {
      return new Response('id,timestamp,name,email,items,total\n', {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="gta-orders.csv"',
        },
      });
    }

    const orders = await Promise.all(
      list.keys.map((k) => env.ORDERS.get(k.name).then((v) => JSON.parse(v)))
    );

    orders.sort((a, b) => a.id.localeCompare(b.id));

    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const headers = ['ID', 'Timestamp', 'Name', 'Email', 'Items', 'Total'];
    const rows = orders.map((o) => [
      q(o.id),
      q(o.timestamp),
      q(o.name),
      q(o.email),
      q(o.items.map((i) => i.qty + 'x ' + i.name + (i.size ? ' (' + i.size + ')' : '')).join('; ')),
      q('$' + o.total),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="gta-orders.csv"',
      },
    });
  }

  return new Response('Method not allowed', { status: 405 });
}

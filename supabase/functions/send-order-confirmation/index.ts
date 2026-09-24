// Preserve the legacy URL while centralizing authentication, ownership and deduplication.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
Deno.serve(async (request: Request) => {
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  const authorization = request.headers.get('authorization');
  if (!authorization || !/^Bearer \S+$/i.test(authorization)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }
  try {
    const { orderId } = await request.json();
    if (typeof orderId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
      return new Response(JSON.stringify({ error: 'Invalid orderId' }), { status: 400, headers });
    }
    const response = await fetch('https://www.beginy.cz/api/send-email', {
      method: 'POST',
      headers: { authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    });
    return new Response(await response.text(), { status: response.status, headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Confirmation unavailable' }), { status: 503, headers });
  }
});

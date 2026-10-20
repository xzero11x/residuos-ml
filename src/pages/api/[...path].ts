import type { APIRoute } from 'astro';
export const prerender = false;
export const ALL: APIRoute = async ({ request, params, url, clientAddress }) => {
  const base = import.meta.env.BLOG_API_URL || 'http://127.0.0.1:4322';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const cookie = request.headers.get('cookie'); if (cookie) headers.Cookie = cookie;
  try { if (clientAddress) headers['x-client-ip'] = clientAddress; } catch {}
  try {
    const response = await fetch(`${base}/api/${params.path}${url.search}`, { method: request.method, headers, ...(['GET', 'HEAD'].includes(request.method) ? {} : { body: await request.text() }) });
    const out = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    for (const c of response.headers.getSetCookie()) out.append('Set-Cookie', c);
    return new Response(await response.text(), { status: response.status, headers: out });
  } catch { return Response.json({ error: 'El servidor no está disponible.' }, { status: 503 }); }
};

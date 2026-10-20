import type { APIRoute } from 'astro';
export const prerender = false;
export const ALL: APIRoute = async ({request,url}) => {
  const base = import.meta.env.BLOG_API_URL || 'http://127.0.0.1:4322';
  try {
    const response = await fetch(`${base}/api/posts${url.search}`, { method: request.method, headers: {'Content-Type':'application/json'}, ...(request.method==='POST'?{body:await request.text()}: {}) });
    return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  } catch { return Response.json({error:'El servidor de la exposición no está disponible.'},{status:503}); }
};

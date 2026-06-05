import type { APIRoute } from 'astro';

export const POST: APIRoute = async () => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', 'sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  headers.append('Set-Cookie', 'sb-refresh-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};

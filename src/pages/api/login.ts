import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const email = body.email || '';
  const password = body.password || '';

  if (!email || !password) {
    return new Response(JSON.stringify({ error: '请填写邮箱和密码' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = import.meta.env.SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!data.session) {
    return new Response(JSON.stringify({ error: '登录失败' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', `sb-access-token=${data.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`);
  headers.append('Set-Cookie', `sb-refresh-token=${data.session.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};

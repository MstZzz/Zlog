import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { email, password, username, display_name } = body;

  if (!email || !password || !username) {
    return new Response(JSON.stringify({ error: '请填写所有必填字段' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (password.length < 6) {
    return new Response(JSON.stringify({ error: '密码至少 6 位' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = import.meta.env.SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: display_name || username },
    },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (data.user?.identities?.length === 0) {
    return new Response(JSON.stringify({ error: '该邮箱已注册' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Auto login after register
  const { data: loginData } = await supabase.auth.signInWithPassword({ email, password });
  const headers = new Headers({ 'Content-Type': 'application/json' });

  if (loginData?.session) {
    headers.append('Set-Cookie', `sb-access-token=${loginData.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`);
    headers.append('Set-Cookie', `sb-refresh-token=${loginData.session.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};

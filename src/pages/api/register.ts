import { createSupabaseServerClient } from '../../lib/supabase';

export async function POST({ request }: { request: Request }) {
  const supabase = createSupabaseServerClient(request);
  const formData = await request.formData();

  const email = formData.get('email')?.toString() || '';
  const password = formData.get('password')?.toString() || '';
  const username = formData.get('username')?.toString() || '';
  const displayName = formData.get('display_name')?.toString() || username;

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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: displayName },
    },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if email confirmation is required
  if (data.user?.identities?.length === 0) {
    return new Response(JSON.stringify({ error: '该邮箱已注册' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Set the auth cookie
  const headers = new Headers();
  
  // Forward the Set-Cookie from Supabase response
  const authResponse = await supabase.auth.signInWithPassword({ email, password });
  if (authResponse.data.session) {
    const { session } = authResponse.data;
    headers.append(
      'Set-Cookie',
      `sb-access-token=${session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    );
    headers.append(
      'Set-Cookie',
      `sb-refresh-token=${session.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
    );
  }

  return new Response(JSON.stringify({ ok: true, user: data.user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) },
  });
}

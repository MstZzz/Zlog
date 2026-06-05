import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const postId = url.searchParams.get('post_id');
  if (!postId) {
    return new Response(JSON.stringify({ comments: [] }), { headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(
    import.meta.env.SUPABASE_URL || '',
    import.meta.env.SUPABASE_ANON_KEY || ''
  );

  const { data: comments } = await supabase
    .from('comments')
    .select('id, content, created_at, author:author_id (id, username, display_name)')
    .eq('post_id', postId)
    .is('parent_id', null)
    .order('created_at', { ascending: true });

  return new Response(JSON.stringify({ comments: comments || [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const supabaseUrl = import.meta.env.SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || '';
  const authToken = request.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith('sb-access-token='))
    ?.split('=')[1];

  if (!authToken) {
    return new Response(JSON.stringify({ error: '未登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${authToken}` } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: '未登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { post_id, content, parent_id } = body;

  if (!post_id || !content) {
    return new Response(JSON.stringify({ error: '缺少参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error } = await supabase.from('comments').insert({
    post_id,
    author_id: user.id,
    content,
    parent_id: parent_id || null,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

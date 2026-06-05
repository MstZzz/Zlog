import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ request }) => {
  const supabaseUrl = import.meta.env.SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || '';
  const authToken = request.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith('sb-access-token='))
    ?.split('=')[1];

  if (!authToken) {
    return new Response(JSON.stringify({ posts: [] }), { headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${authToken}` } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ posts: [] }), { headers: { 'Content-Type': 'application/json' } });
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('id, slug, title, description, date, tags')
    .eq('author_id', user.id)
    .order('date', { ascending: false })
    .limit(50);

  return new Response(JSON.stringify({ posts: posts || [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  // 1. Auth — check session cookie
  const supabaseUrl = import.meta.env.SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || '';

  const authToken = request.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith('sb-access-token='))
    ?.split('=')[1];

  if (!authToken) {
    return new Response(JSON.stringify({ ok: false, error: '未登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${authToken}` } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ ok: false, error: '身份验证失败' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Parse body
  const body = await request.json();
  const { title, description, tags, content, source } = body;

  if (!title || !content) {
    return new Response(JSON.stringify({ ok: false, error: '标题和正文不能为空' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Extract or generate content
  let finalContent = content;
  let finalTitle = title;
  let finalDescription = description || '';
  let finalTags: string[] = tags || [];
  let finalDate = body.date || new Date().toISOString().split('T')[0];

  if (source === 'upload') {
    // Attempt to parse frontmatter from uploaded .md
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\n*([\s\S]*)$/);
    if (fmMatch) {
      const fmLines = fmMatch[1].split('\n');
      fmLines.forEach(line => {
        const [key, ...vals] = line.split(':');
        const val = vals.join(':').trim().replace(/^["']|["']$/g, '');
        if (key === 'title') finalTitle = val;
        else if (key === 'description') finalDescription = val;
        else if (key === 'date') finalDate = val;
        else if (key === 'tags') {
          try { finalTags = JSON.parse(val.replace(/'/g, '"')); } catch {}
        }
      });
      finalContent = fmMatch[2].trim();
    }
  }

  // 4. Generate slug
  let slug = finalTitle
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) slug = `post-${Date.now()}`;

  // 5. Check uniqueness
  const { data: existing } = await supabase
    .from('posts')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // 6. Insert
  const { data: post, error: insertError } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      slug,
      title: finalTitle,
      description: finalDescription,
      content: finalContent,
      tags: finalTags,
      date: finalDate,
      draft: false,
    })
    .select('id, slug')
    .single();

  if (insertError) {
    return new Response(JSON.stringify({ ok: false, error: `数据库错误: ${insertError.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    slug: post.slug,
    message: '文章已发布',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

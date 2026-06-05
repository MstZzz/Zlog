import { createClient } from '@supabase/supabase-js';
import rss from '@astrojs/rss';

export async function GET(context) {
  const supabase = createClient(
    import.meta.env.SUPABASE_URL || '',
    import.meta.env.SUPABASE_ANON_KEY || ''
  );

  const { data: posts } = await supabase
    .from('posts')
    .select('title, description, date, slug')
    .eq('draft', false)
    .order('date', { ascending: false })
    .limit(20);

  return rss({
    title: 'ZLog',
    description: '记录生活与工作，思考与创作。',
    site: context.site,
    items: (posts || []).map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: new Date(post.date),
      link: `/blog/${post.slug}/`,
    })),
  });
}

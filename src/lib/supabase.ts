import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || '';

// Server-side Supabase client
export function createSupabaseServerClient(request?: Request) {
  const authToken = request?.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith('sb-access-token='))
    ?.split('=')[1];

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    },
  });
}

// Check auth and return user
export async function getAuthUser(request: Request) {
  const supabase = createSupabaseServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Get user with profile
export async function getUserProfile(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return null;

  const supabase = createSupabaseServerClient(request);
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { ...user, profile };
}

import { defineMiddleware } from 'astro/middleware';
import { getAuthUser } from './lib/supabase';

const protectedRoutes = ['/dashboard'];

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Redirect old admin to dashboard
  if (pathname === '/admin' || pathname === '/admin/') {
    return context.redirect('/dashboard');
  }

  // Check auth for protected routes
  if (protectedRoutes.some(prefix => pathname.startsWith(prefix)) && pathname !== '/api/') {
    const user = await getAuthUser(context.request);
    if (!user) {
      return context.redirect('/login');
    }
    context.locals.user = user;
  }

  return next();
});

import { defineMiddleware } from 'astro/middleware';
import { getAuthUser } from './lib/supabase';

const protectedRoutes = ['/write', '/my-posts'];

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Redirect old dashboard to my-posts
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return context.redirect('/my-posts');
  }

  // Redirect old admin to homepage
  if (pathname === '/admin' || pathname === '/admin/') {
    return context.redirect('/');
  }

  // Check auth for protected routes
  if (protectedRoutes.some(prefix => pathname.startsWith(prefix))) {
    const user = await getAuthUser(context.request);
    if (!user) {
      return context.redirect('/login');
    }
    context.locals.user = user;
  }

  return next();
});

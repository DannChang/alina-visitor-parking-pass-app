import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the token using JWT strategy (Edge-compatible)
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error('NEXTAUTH_SECRET is not set');
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret,
  });

  const isLoggedIn = !!token;
  const userRole = token?.role as string | undefined;

  // Public routes - always accessible
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/api/health',
    '/api/passes/validate',
  ];

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith('/register/')
  );

  // API routes that don't need auth (public endpoints)
  const publicApiRoutes = ['/api/health', '/api/passes/register', '/api/passes', '/api/auth', '/api/units'];
  const isPublicApi = publicApiRoutes.some((route) => pathname.startsWith(route));

  // If accessing a public route, allow
  if (isPublicRoute || isPublicApi) {
    // Redirect logged-in users away from login page
    if (pathname === '/login' && isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Dashboard routes require authentication
  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based access control for specific dashboard routes
    const adminOnlyRoutes = ['/dashboard/settings', '/dashboard/users'];
    const isAdminOnlyRoute = adminOnlyRoutes.some((route) => pathname.startsWith(route));

    if (isAdminOnlyRoute && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protected API routes
  if (pathname.startsWith('/api') && !isPublicApi) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

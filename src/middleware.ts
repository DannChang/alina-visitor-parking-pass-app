import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Role-based route permissions for Edge middleware.
 * This is a simplified version of the authorization module
 * to ensure Edge runtime compatibility.
 */
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SECURITY' | 'RESIDENT';

// Route permissions - maps routes to roles that can access them
// Empty array means all authenticated users can access
const ROUTE_ACCESS: Record<string, UserRole[]> = {
  '/dashboard': [], // All authenticated users
  '/dashboard/passes': [], // All authenticated users (data filtering happens at API level)
  '/dashboard/violations': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SECURITY'],
  '/dashboard/units': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  '/dashboard/analytics': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  '/dashboard/health': ['SUPER_ADMIN', 'ADMIN'],
  '/dashboard/users': ['SUPER_ADMIN', 'ADMIN'],
  '/dashboard/settings': ['SUPER_ADMIN', 'ADMIN'],
};

function canAccessRoute(role: UserRole, pathname: string): boolean {
  // Find the most specific matching route
  const matchingRoutes = Object.keys(ROUTE_ACCESS)
    .filter((route) => pathname === route || pathname.startsWith(route + '/'))
    .sort((a, b) => b.length - a.length);

  const route = matchingRoutes[0];

  if (!route) {
    // Unknown dashboard routes - deny by default for security
    if (pathname.startsWith('/dashboard')) {
      return false;
    }
    return true;
  }

  const allowedRoles = ROUTE_ACCESS[route];

  // Empty array or undefined means any authenticated user can access
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.includes(role);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the token using JWT strategy (Edge-compatible)
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error('NEXTAUTH_SECRET is not set');
    return NextResponse.redirect(new URL('/error', request.url));
  }

  const token = await getToken({
    req: request,
    secret,
  });

  const isLoggedIn = !!token;
  const userRole = token?.role as UserRole | undefined;

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

  // API routes that don't need auth (public endpoints for visitor self-service)
  const publicApiRoutes = [
    '/api/health',
    '/api/passes/register',
    '/api/passes',
    '/api/auth',
    '/api/units',
  ];
  const isPublicApi = publicApiRoutes.some((route) => pathname.startsWith(route));

  // If accessing a public route, allow
  if (isPublicRoute || isPublicApi) {
    // Redirect logged-in users away from login page
    if (pathname === '/login' && isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Dashboard routes require authentication AND authorization
  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check route-level permissions using centralized authorization
    if (userRole && !canAccessRoute(userRole, pathname)) {
      // Redirect to dashboard with access denied indicator
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Protected API routes - authentication required
  // Fine-grained permission checks happen in individual route handlers
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

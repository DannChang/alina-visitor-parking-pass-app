import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Role-based route permissions for Edge middleware.
 * This is a simplified version of the authorization module
 * to ensure Edge runtime compatibility.
 */
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SECURITY' | 'RESIDENT';

function getAuthenticatedDestination(role?: UserRole): string {
  return role === 'RESIDENT' ? '/resident/passes' : '/dashboard';
}

export function shouldBypassPublicAuthRedirect(
  pathname: string,
  searchParams: URLSearchParams
): boolean {
  return pathname === '/resident/login' && searchParams.get('showResidentLogin') === '1';
}

// Route permissions - maps routes to roles that can access them
// Empty array means all authenticated users can access
const ROUTE_ACCESS: Record<string, UserRole[]> = {
  '/dashboard': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SECURITY'],
  '/dashboard/passes': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SECURITY'],
  '/dashboard/violations': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SECURITY'],
  '/dashboard/units': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  '/dashboard/analytics': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  '/dashboard/health': ['SUPER_ADMIN', 'ADMIN'],
  '/dashboard/users': ['SUPER_ADMIN', 'ADMIN'],
  '/dashboard/registration-passes': ['SUPER_ADMIN', 'MANAGER'],
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

function isSecureAuthRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0]?.trim() === 'https';
  }

  return request.nextUrl.protocol === 'https:';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never run auth/redirect logic for framework assets or public files.
  // In dev, intercepting these requests can surface as MIME-type errors when
  // JS/CSS chunks receive redirect or JSON responses instead of asset bytes.
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Public routes - always accessible
  const publicRoutes = [
    '/',
    '/error',
    '/login',
    '/forgot-password',
    '/register',
    '/reset-password',
    '/privacy-policy',
    '/resident/login',
    '/resident/forgot-password',
    '/api/health',
    '/api/passes/validate',
  ];

  // Check if current path is public
  const isPublicRoute =
    publicRoutes.some((route) => pathname === route) ||
    pathname.startsWith('/register/') ||
    pathname.startsWith('/reset-password/');

  // API routes that don't need auth (public endpoints for visitor self-service)
  const publicApiRoutes = [
    '/api/health',
    '/api/passes/register',
    '/api/passes',
    '/api/auth',
    '/api/units',
    '/api/buildings',
    '/api/resident/auth',
    '/api/resident-invites/consume',
    '/api/password-reset',
  ];
  const isPublicApi = publicApiRoutes.some((route) => pathname.startsWith(route));

  // Get the token using JWT strategy (Edge-compatible)
  // Auth.js v5 commonly uses AUTH_SECRET; keep NEXTAUTH_SECRET for compatibility.
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error('AUTH_SECRET/NEXTAUTH_SECRET is not set');

    if (isPublicRoute || pathname === '/error') {
      return NextResponse.next();
    }

    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Authentication is not configured for this deployment.' },
        { status: 500 }
      );
    }

    return NextResponse.redirect(new URL('/error', request.url));
  }

  const token = await getToken({
    req: request,
    secret,
    secureCookie: isSecureAuthRequest(request),
  });

  const isLoggedIn = !!token;
  const userRole = token?.role as UserRole | undefined;
  const bypassPublicAuthRedirect = shouldBypassPublicAuthRedirect(
    pathname,
    request.nextUrl.searchParams
  );

  // If accessing a public route, allow
  if (isPublicRoute || isPublicApi) {
    // Redirect logged-in users away from login page
    if (pathname === '/login' && isLoggedIn) {
      return NextResponse.redirect(new URL(getAuthenticatedDestination(userRole), request.url));
    }
    if (pathname === '/resident/login' && isLoggedIn && !bypassPublicAuthRedirect) {
      return NextResponse.redirect(new URL(getAuthenticatedDestination(userRole), request.url));
    }
    return NextResponse.next();
  }

  // Resident routes require authentication
  if (pathname.startsWith('/resident') && !isPublicRoute) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/resident/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole !== 'RESIDENT') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Dashboard routes require authentication AND authorization
  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole === 'RESIDENT') {
      return NextResponse.redirect(new URL('/resident/passes', request.url));
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
    // Match application routes and APIs, but skip framework assets and files.
    '/((?!_next|favicon.ico|.*\\.[^/]+$).*)',
  ],
};

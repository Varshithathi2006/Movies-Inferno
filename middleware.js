import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Public routes that don't require authentication
    const publicRoutes = [
      '/',
      '/auth/signin',
      '/auth/signup',
      '/auth/forgot-password',
      '/movies',
      '/tv',
      '/search',
      '/genre',
      '/person',
      '/api/health',
      '/api/auth'
    ];

    // Check if the current path is a public route
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    );

    // Admin routes that require admin role
    const adminRoutes = ['/admin', '/api/admin'];
    const isAdminRoute = adminRoutes.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    );

    // Protected routes that require authentication
    const protectedRoutes = [
      '/dashboard',
      '/profile',
      '/watchlist',
      '/reviews',
      '/preferences',
      '/chatbot'
    ];
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    );

    // If it's a public route, allow access
    if (isPublicRoute) {
      return NextResponse.next();
    }

    // If user is not authenticated and trying to access protected route
    if (!token && (isProtectedRoute || isAdminRoute)) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // If user is authenticated but trying to access admin route without admin role
    if (token && isAdminRoute && token.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (token && pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Always allow access to public routes and API routes
        if (pathname.startsWith('/api/') || 
            pathname.startsWith('/auth/') ||
            pathname === '/' ||
            pathname.startsWith('/movies') ||
            pathname.startsWith('/tv') ||
            pathname.startsWith('/search') ||
            pathname.startsWith('/genre') ||
            pathname.startsWith('/person')) {
          return true;
        }

        // For protected routes, require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
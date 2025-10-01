import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '../contexts/AuthContext';
import Navigation from '../components/Navigation';
import '../styles/globals.css';

export default function App({
  Component,
  pageProps: { session, ...pageProps }
}) {
  // Check if the current page should have navigation
  const noNavPages = ['/auth/signin', '/auth/signup', '/auth/forgot-password'];
  const showNavigation = !noNavPages.includes(Component.displayName);

  return (
    <SessionProvider session={session}>
      <AuthProvider>
        <div className="min-h-screen bg-gray-900">
          {showNavigation && <Navigation />}
          <Component {...pageProps} />
        </div>
      </AuthProvider>
    </SessionProvider>
  );
}
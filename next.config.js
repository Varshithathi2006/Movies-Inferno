/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Image optimization for TMDB and Azure Blob Storage
  images: {
    domains: [
      'image.tmdb.org',
      'www.themoviedb.org',
      // Add your Azure Storage account domain
      process.env.AZURE_STORAGE_ACCOUNT_NAME ? `${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net` : 'placeholder.blob.core.windows.net'
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Environment variables to expose to the client
  env: {
    AZURE_AD_B2C_TENANT_NAME: process.env.AZURE_AD_B2C_TENANT_NAME,
    AZURE_AD_B2C_CLIENT_ID: process.env.AZURE_AD_B2C_CLIENT_ID,
    AZURE_AD_B2C_PRIMARY_USER_FLOW: process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW,
    AZURE_AD_B2C_PASSWORD_RESET_USER_FLOW: process.env.AZURE_AD_B2C_PASSWORD_RESET_USER_FLOW,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Redirects for authentication
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/signin',
        permanent: true,
      },
      {
        source: '/register',
        destination: '/auth/signup',
        permanent: true,
      },
    ];
  },

  // Webpack configuration for Azure SDK compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },

  // Output configuration for Azure Static Web Apps
  output: 'standalone',
  
  // Experimental features
  experimental: {
    // Enable if using App Router in the future
    // appDir: true,
  },
};

module.exports = nextConfig;
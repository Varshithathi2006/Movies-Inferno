// NextAuth.js configuration for Azure AD B2C
import NextAuth from 'next-auth';
import AzureADB2CProvider from 'next-auth/providers/azure-ad-b2c';
import { azurePostgreSQLClient } from '../../../azure/config/azure-config.js';

export const authOptions = {
  providers: [
    AzureADB2CProvider({
      tenantId: process.env.AZURE_AD_B2C_TENANT_NAME,
      clientId: process.env.AZURE_AD_B2C_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET,
      primaryUserFlow: process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW,
      authorization: {
        params: {
          scope: 'openid profile email offline_access'
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.emails?.[0] || profile.email,
          image: profile.picture,
          username: profile.given_name || profile.email?.split('@')[0]
        };
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Persist the OAuth access_token and refresh_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.idToken = account.id_token;
      }

      // Add user profile information
      if (profile) {
        token.username = profile.given_name || profile.email?.split('@')[0];
        token.email_verified = profile.email_verified;
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < token.expiresAt * 1000) {
        return token;
      }

      // Access token has expired, try to update it
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken;
      session.error = token.error;
      
      if (session.user) {
        session.user.id = token.sub;
        session.user.username = token.username;
        session.user.email_verified = token.email_verified;
      }

      return session;
    },

    async signIn({ user, account, profile, email, credentials }) {
      try {
        // Sync user with Azure PostgreSQL database
        await syncUserWithDatabase(user, profile);
        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        return false;
      }
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/new-user'
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },

  events: {
    async signOut({ token }) {
      // Perform any cleanup when user signs out
      console.log('User signed out:', token.sub);
    },
    async session({ session, token }) {
      // Update last seen timestamp
      if (session.user?.id) {
        try {
          await azurePostgreSQLClient.initialize();
          await azurePostgreSQLClient.query(
            'UPDATE users SET last_seen_at = $1, updated_at = $2 WHERE id = $3',
            [new Date().toISOString(), new Date().toISOString(), session.user.id]
          );
        } catch (error) {
          console.error('Error updating last seen:', error);
        }
      }
    }
  },

  debug: process.env.NODE_ENV === 'development',

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);

// Helper function to refresh access token
async function refreshAccessToken(token) {
  try {
    const url = `https://${process.env.AZURE_AD_B2C_TENANT_NAME}.b2clogin.com/${process.env.AZURE_AD_B2C_TENANT_NAME}.onmicrosoft.com/${process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW}/oauth2/v2.0/token`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_B2C_CLIENT_ID,
        client_secret: process.env.AZURE_AD_B2C_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
        scope: 'openid profile email offline_access'
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);

    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

// Helper function to sync user with database
async function syncUserWithDatabase(user, profile) {
  try {
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username || user.email?.split('@')[0],
      full_name: user.name,
      avatar_url: user.image,
      email_verified: profile?.email_verified || false,
      updated_at: new Date().toISOString()
    };

    // Initialize database connection
    await azurePostgreSQLClient.initialize();

    // Check if user exists
    const existingUserResult = await azurePostgreSQLClient.query(
      'SELECT id FROM users WHERE id = $1',
      [user.id]
    );

    if (existingUserResult.rows.length > 0) {
      // Update existing user
      await azurePostgreSQLClient.query(
        'UPDATE users SET email = $1, username = $2, full_name = $3, avatar_url = $4, email_verified = $5, updated_at = $6 WHERE id = $7',
        [userData.email, userData.username, userData.full_name, userData.avatar_url, userData.email_verified, userData.updated_at, user.id]
      );
    } else {
      // Create new user
      await azurePostgreSQLClient.query(
        'INSERT INTO users (id, email, username, full_name, avatar_url, email_verified, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [user.id, userData.email, userData.username, userData.full_name, userData.avatar_url, userData.email_verified, new Date().toISOString(), userData.updated_at]
      );

      // Create default user preferences
      await azurePostgreSQLClient.query(
        'INSERT INTO user_preferences (user_id, preferred_genres, preferred_languages, content_rating_preference, notification_settings, privacy_settings, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          user.id,
          JSON.stringify([]),
          JSON.stringify(['en']),
          'PG-13',
          JSON.stringify({
            email_notifications: true,
            push_notifications: false,
            marketing_emails: false
          }),
          JSON.stringify({
            profile_visibility: 'public',
            show_watchlist: true,
            show_reviews: true
          }),
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );
    }
  } catch (error) {
    console.error('Error syncing user with database:', error);
    throw error;
  }
}
// Azure AD B2C Authentication Configuration
import { PublicClientApplication, LogLevel } from '@azure/msal-browser';
import azureClient from '../azureClient';

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_B2C_CLIENT_ID,
    authority: `https://${process.env.NEXT_PUBLIC_AZURE_AD_B2C_TENANT_NAME}.b2clogin.com/${process.env.NEXT_PUBLIC_AZURE_AD_B2C_TENANT_NAME}.onmicrosoft.com/${process.env.NEXT_PUBLIC_AZURE_AD_B2C_POLICY_NAME}`,
    knownAuthorities: [`${process.env.NEXT_PUBLIC_AZURE_AD_B2C_TENANT_NAME}.b2clogin.com`],
    redirectUri: process.env.NEXT_PUBLIC_AZURE_AD_B2C_REDIRECT_URI || '/',
    postLogoutRedirectUri: process.env.NEXT_PUBLIC_AZURE_AD_B2C_POST_LOGOUT_REDIRECT_URI || '/'
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      }
    }
  }
};

// Login request configuration
const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
  prompt: 'select_account'
};

// Token request configuration
const tokenRequest = {
  scopes: ['openid', 'profile', 'email'],
  forceRefresh: false
};

// Password reset policy configuration
const passwordResetRequest = {
  authority: `https://${process.env.NEXT_PUBLIC_AZURE_AD_B2C_TENANT_NAME}.b2clogin.com/${process.env.NEXT_PUBLIC_AZURE_AD_B2C_TENANT_NAME}.onmicrosoft.com/${process.env.NEXT_PUBLIC_AZURE_AD_B2C_PASSWORD_RESET_POLICY}`,
  scopes: ['openid', 'profile', 'email']
};

// Profile edit policy configuration
const profileEditRequest = {
  authority: `https://${process.env.NEXT_PUBLIC_AZURE_AD_B2C_TENANT_NAME}.b2clogin.com/${process.env.NEXT_PUBLIC_AZURE_AD_B2C_TENANT_NAME}.onmicrosoft.com/${process.env.NEXT_PUBLIC_AZURE_AD_B2C_PROFILE_EDIT_POLICY}`,
  scopes: ['openid', 'profile', 'email']
};

class AzureADB2CAuth {
  constructor() {
    this.msalInstance = new PublicClientApplication(msalConfig);
    this.currentUser = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      await this.msalInstance.initialize();
      this.isInitialized = true;
      
      // Handle redirect response
      const response = await this.msalInstance.handleRedirectPromise();
      if (response) {
        this.currentUser = response.account;
        await this.syncUserWithDatabase(response.account);
      } else {
        // Check if user is already logged in
        const accounts = this.msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          this.currentUser = accounts[0];
        }
      }
    } catch (error) {
      console.error('Failed to initialize MSAL:', error);
      throw error;
    }
  }

  async signIn() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.msalInstance.loginPopup(loginRequest);
      this.currentUser = response.account;
      
      // Sync user with database
      await this.syncUserWithDatabase(response.account);
      
      return {
        user: this.formatUser(response.account),
        error: null
      };
    } catch (error) {
      console.error('Sign in failed:', error);
      
      // Handle password reset flow
      if (error.errorMessage && error.errorMessage.includes('AADB2C90118')) {
        return this.resetPassword();
      }
      
      return {
        user: null,
        error: error.message
      };
    }
  }

  async signInRedirect() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Sign in redirect failed:', error);
      throw error;
    }
  }

  async signOut() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const logoutRequest = {
        account: this.currentUser,
        postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri
      };
      
      await this.msalInstance.logoutPopup(logoutRequest);
      this.currentUser = null;
      
      return { error: null };
    } catch (error) {
      console.error('Sign out failed:', error);
      return { error: error.message };
    }
  }

  async getAccessToken() {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    try {
      const response = await this.msalInstance.acquireTokenSilent({
        ...tokenRequest,
        account: this.currentUser
      });
      
      return response.accessToken;
    } catch (error) {
      console.error('Failed to acquire token silently:', error);
      
      // Fallback to interactive token acquisition
      try {
        const response = await this.msalInstance.acquireTokenPopup({
          ...tokenRequest,
          account: this.currentUser
        });
        
        return response.accessToken;
      } catch (interactiveError) {
        console.error('Failed to acquire token interactively:', interactiveError);
        throw interactiveError;
      }
    }
  }

  async resetPassword() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.msalInstance.loginPopup(passwordResetRequest);
      return {
        user: this.formatUser(response.account),
        error: null
      };
    } catch (error) {
      console.error('Password reset failed:', error);
      return {
        user: null,
        error: error.message
      };
    }
  }

  async editProfile() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.msalInstance.loginPopup(profileEditRequest);
      this.currentUser = response.account;
      
      // Update user in database
      await this.syncUserWithDatabase(response.account);
      
      return {
        user: this.formatUser(response.account),
        error: null
      };
    } catch (error) {
      console.error('Profile edit failed:', error);
      return {
        user: null,
        error: error.message
      };
    }
  }

  getCurrentUser() {
    if (!this.currentUser) {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        this.currentUser = accounts[0];
      }
    }
    
    return this.currentUser ? this.formatUser(this.currentUser) : null;
  }

  isAuthenticated() {
    return this.getCurrentUser() !== null;
  }

  formatUser(account) {
    if (!account) return null;
    
    return {
      id: account.localAccountId,
      email: account.username,
      name: account.name || account.username,
      username: account.idTokenClaims?.given_name || account.username.split('@')[0],
      avatar_url: null, // B2C doesn't provide avatar by default
      email_verified: true, // B2C handles email verification
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  async syncUserWithDatabase(account) {
    try {
      const user = this.formatUser(account);
      
      // Check if user exists in database
      const { data: existingUser, error: fetchError } = await azureClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing user:', fetchError);
        return;
      }

      if (existingUser) {
        // Update existing user
        const { error: updateError } = await azureClient
          .from('users')
          .update({
            email: user.email,
            username: user.username,
            full_name: user.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating user:', updateError);
        }
      } else {
        // Create new user
        const { error: insertError } = await azureClient
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            username: user.username,
            full_name: user.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating user:', insertError);
        }
      }
    } catch (error) {
      console.error('Error syncing user with database:', error);
    }
  }

  // Event handlers
  onAuthStateChange(callback) {
    // Set up account change listener
    this.msalInstance.addEventCallback((event) => {
      if (event.eventType === 'msal:loginSuccess' || 
          event.eventType === 'msal:logoutSuccess' ||
          event.eventType === 'msal:acquireTokenSuccess') {
        const user = this.getCurrentUser();
        callback(user);
      }
    });
  }

  // Utility methods
  getIdToken() {
    if (!this.currentUser) return null;
    return this.currentUser.idToken;
  }

  getClaims() {
    if (!this.currentUser) return null;
    return this.currentUser.idTokenClaims;
  }

  async refreshToken() {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    try {
      const response = await this.msalInstance.acquireTokenSilent({
        ...tokenRequest,
        account: this.currentUser,
        forceRefresh: true
      });
      
      return response.accessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  }
}

// Create singleton instance
const azureAuth = new AzureADB2CAuth();

export default azureAuth;

// Export utility functions
export const {
  signIn,
  signInRedirect,
  signOut,
  getCurrentUser,
  isAuthenticated,
  getAccessToken,
  resetPassword,
  editProfile,
  onAuthStateChange
} = azureAuth;

// Initialize on import (for client-side only)
if (typeof window !== 'undefined') {
  azureAuth.initialize().catch(console.error);
}
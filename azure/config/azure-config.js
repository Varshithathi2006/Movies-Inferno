// Azure Configuration for Movie Inferno
// Centralized configuration for all Azure services

import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { BlobServiceClient } from '@azure/storage-blob';
import { Pool } from 'pg';
import MockDatabase from '../../lib/mockDatabase.js';

// Environment variables
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_KEY_VAULT_URL = process.env.AZURE_KEY_VAULT_URL;
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_POSTGRESQL_CONNECTION_STRING = process.env.AZURE_POSTGRESQL_CONNECTION_STRING;
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;

// Azure AD B2C Configuration
export const azureAdB2cConfig = {
  auth: {
    clientId: process.env.AZURE_AD_B2C_CLIENT_ID,
    authority: `https://${process.env.AZURE_AD_B2C_TENANT_NAME}.b2clogin.com/${process.env.AZURE_AD_B2C_TENANT_NAME}.onmicrosoft.com/${process.env.AZURE_AD_B2C_POLICY_NAME}`,
    knownAuthorities: [`${process.env.AZURE_AD_B2C_TENANT_NAME}.b2clogin.com`],
    redirectUri: process.env.AZURE_AD_B2C_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    postLogoutRedirectUri: process.env.AZURE_AD_B2C_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  scopes: ['openid', 'profile', 'email'],
  policies: {
    signUpSignIn: process.env.AZURE_AD_B2C_POLICY_NAME,
    forgotPassword: process.env.AZURE_AD_B2C_FORGOT_PASSWORD_POLICY,
    editProfile: process.env.AZURE_AD_B2C_EDIT_PROFILE_POLICY,
  }
};

// Azure Credential Management
let credential;
try {
  credential = new DefaultAzureCredential();
} catch (error) {
  console.warn('Azure DefaultAzureCredential not available, using environment variables');
}

// Key Vault Client
let keyVaultClient;
if (AZURE_KEY_VAULT_URL) {
  try {
    keyVaultClient = new SecretClient(AZURE_KEY_VAULT_URL, credential);
  } catch (error) {
    console.warn('Key Vault client initialization failed:', error.message);
  }
}

// Secret Management
export class AzureSecretManager {
  static async getSecret(secretName) {
    // For development, prioritize environment variables
    const envVarName = secretName.toUpperCase().replace(/-/g, '_');
    const envValue = process.env[envVarName];
    
    if (envValue) {
      return envValue;
    }

    if (!keyVaultClient) {
      console.warn(`Key Vault not available and no environment variable found for: ${envVarName}`);
      return null;
    }

    try {
      const secret = await keyVaultClient.getSecret(secretName);
      return secret.value;
    } catch (error) {
      console.error(`Failed to retrieve secret ${secretName}:`, error.message);
      return null;
    }
  }

  static async setSecret(secretName, secretValue) {
    if (!keyVaultClient) {
      throw new Error('Key Vault client not available');
    }

    try {
      await keyVaultClient.setSecret(secretName, secretValue);
      return true;
    } catch (error) {
      console.error(`Failed to set secret ${secretName}:`, error.message);
      return false;
    }
  }
}

// Azure Blob Storage Configuration
export class AzureBlobStorage {
  constructor() {
    if (AZURE_STORAGE_CONNECTION_STRING) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    } else if (AZURE_STORAGE_ACCOUNT_NAME && credential) {
      this.blobServiceClient = new BlobServiceClient(
        `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
        credential
      );
    } else {
      throw new Error('Azure Storage configuration missing');
    }
  }

  // Container names
  static containers = {
    MEDIA: 'media',
    POSTERS: 'posters', 
    PROFILES: 'profiles',
    STILLS: 'stills',
    TRAILERS: 'trailers'
  };

  async getContainerClient(containerName) {
    return this.blobServiceClient.getContainerClient(containerName);
  }

  async uploadBlob(containerName, blobName, data, options = {}) {
    try {
      const containerClient = await this.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: options.contentType || 'application/octet-stream',
        },
        metadata: options.metadata || {},
        ...options
      };

      const uploadResponse = await blockBlobClient.upload(data, data.length, uploadOptions);
      return {
        success: true,
        url: blockBlobClient.url,
        etag: uploadResponse.etag,
        lastModified: uploadResponse.lastModified
      };
    } catch (error) {
      console.error(`Failed to upload blob ${blobName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async generateSasToken(containerName, blobName, permissions = 'r', expiryHours = 24) {
    try {
      const containerClient = await this.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);
      
      const sasOptions = {
        containerName,
        blobName,
        permissions,
        expiresOn: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
      };

      // Note: This requires account key or user delegation key
      // For production, implement proper SAS token generation
      return blobClient.generateSasUrl(sasOptions);
    } catch (error) {
      console.error(`Failed to generate SAS token for ${blobName}:`, error.message);
      return null;
    }
  }

  async deleteBlob(containerName, blobName) {
    try {
      const containerClient = await this.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);
      await blobClient.delete();
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete blob ${blobName}:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

// PostgreSQL Database Configuration
export class AzurePostgreSQLClient {
  constructor() {
    this.pool = null;
    this.connectionString = null;
    this.mockDb = null;
    this.useMockDb = false;
  }

  async initialize() {
    try {
      // Try to get connection string from Key Vault first
      this.connectionString = await AzureSecretManager.getSecret('postgresql-connection-string') 
        || AZURE_POSTGRESQL_CONNECTION_STRING;

      if (!this.connectionString) {
        throw new Error('PostgreSQL connection string not found');
      }

      this.pool = new Pool({
        connectionString: this.connectionString,
        ssl: {
          rejectUnauthorized: false // Azure PostgreSQL requires SSL
        },
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      console.log('Azure PostgreSQL connection established');
      return true;
    } catch (error) {
      console.error('Failed to initialize PostgreSQL connection:', error.message);
      
      // Fall back to mock database in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock database for development');
        this.mockDb = new MockDatabase();
        this.useMockDb = true;
        return true;
      }
      
      return false;
    }
  }

  async query(text, params) {
    if (!this.pool && !this.useMockDb) {
      await this.initialize();
    }

    try {
      if (this.useMockDb && this.mockDb) {
        return await this.mockDb.query(text, params);
      }
      
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error.message);
      throw error;
    }
  }

  async setUserContext(userId) {
    if (!this.pool) {
      await this.initialize();
    }

    try {
      await this.pool.query('SELECT set_current_user_id($1)', [userId]);
    } catch (error) {
      console.error('Failed to set user context:', error.message);
    }
  }

  async clearUserContext() {
    if (!this.pool) {
      await this.initialize();
    }

    try {
      await this.pool.query('SELECT clear_current_user_id()');
    } catch (error) {
      console.error('Failed to clear user context:', error.message);
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Azure OpenAI Configuration
export class AzureOpenAIClient {
  constructor() {
    this.endpoint = AZURE_OPENAI_ENDPOINT;
    this.apiKey = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      this.apiKey = await AzureSecretManager.getSecret('openai-api-key') || AZURE_OPENAI_API_KEY;
      
      if (!this.endpoint || !this.apiKey) {
        console.warn('Azure OpenAI configuration incomplete');
        return false;
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Azure OpenAI:', error.message);
      return false;
    }
  }

  async generateChatCompletion(messages, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('Azure OpenAI not properly configured');
    }

    try {
      const response = await fetch(`${this.endpoint}/openai/deployments/${options.deploymentName || 'gpt-35-turbo'}/chat/completions?api-version=2023-12-01-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          messages,
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.95,
          frequency_penalty: options.frequencyPenalty || 0,
          presence_penalty: options.presencePenalty || 0,
          stop: options.stop || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Azure OpenAI API call failed:', error.message);
      throw error;
    }
  }
}

// Application Insights Configuration
export const applicationInsightsConfig = {
  connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  enableAutoCollectRequests: true,
  enableAutoCollectPerformance: true,
  enableAutoCollectExceptions: true,
  enableAutoCollectDependencies: true,
  enableAutoCollectConsole: true,
  enableUseDiskRetryCaching: true,
  enableAutoCollectPreAggregatedMetrics: true,
  enableAutoCollectHeartbeat: true,
  enableWebInstrumentation: true,
};

// Singleton instances
export const azureBlobStorage = new AzureBlobStorage();
export const azurePostgreSQLClient = new AzurePostgreSQLClient();
export const azureOpenAIClient = new AzureOpenAIClient();

// Health check function
export async function checkAzureServicesHealth() {
  const health = {
    database: false,
    storage: false,
    keyVault: false,
    openai: false,
    timestamp: new Date().toISOString()
  };

  try {
    // Check database
    await azurePostgreSQLClient.query('SELECT 1');
    health.database = true;
  } catch (error) {
    console.error('Database health check failed:', error.message);
  }

  try {
    // Check storage
    const containerClient = await azureBlobStorage.getContainerClient('media');
    await containerClient.exists();
    health.storage = true;
  } catch (error) {
    console.error('Storage health check failed:', error.message);
  }

  try {
    // Check Key Vault
    if (keyVaultClient) {
      await keyVaultClient.getSecret('health-check');
      health.keyVault = true;
    }
  } catch (error) {
    // Expected to fail if secret doesn't exist
    health.keyVault = !!keyVaultClient;
  }

  try {
    // Check OpenAI
    health.openai = await azureOpenAIClient.initialize();
  } catch (error) {
    console.error('OpenAI health check failed:', error.message);
  }

  return health;
}

// Export configuration object
export const azureConfig = {
  tenantId: AZURE_TENANT_ID,
  clientId: AZURE_CLIENT_ID,
  keyVaultUrl: AZURE_KEY_VAULT_URL,
  storageAccountName: AZURE_STORAGE_ACCOUNT_NAME,
  openaiEndpoint: AZURE_OPENAI_ENDPOINT,
  adB2c: azureAdB2cConfig,
  applicationInsights: applicationInsightsConfig,
};

export default azureConfig;
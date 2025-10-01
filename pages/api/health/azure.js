// Azure Services Health Check API Endpoint
// Comprehensive health check for all Azure services

import { 
  azureBlobStorage, 
  azureOpenAIClient, 
  AzureSecretManager,
  checkAzureServicesHealth 
} from '../../../azure/config/azure-config.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();
    
    // Get overall Azure services health
    const azureHealth = await checkAzureServicesHealth();
    
    // Detailed storage check
    let storageDetails = null;
    try {
      const mediaContainer = await azureBlobStorage.getContainerClient('media');
      const containerExists = await mediaContainer.exists();
      
      // List some blobs to test access
      const blobIterator = mediaContainer.listBlobsFlat({ maxPageSize: 5 });
      const blobPage = await blobIterator.next();
      
      storageDetails = {
        connected: true,
        mediaContainerExists: containerExists,
        sampleBlobCount: blobPage.value ? blobPage.value.length : 0,
        accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME
      };
    } catch (error) {
      storageDetails = {
        connected: false,
        error: error.message
      };
    }

    // Detailed Key Vault check
    let keyVaultDetails = null;
    try {
      // Try to access a test secret (this might fail if secret doesn't exist)
      const testSecret = await AzureSecretManager.getSecret('health-check');
      keyVaultDetails = {
        connected: true,
        canAccessSecrets: true,
        vaultUrl: process.env.AZURE_KEY_VAULT_URL
      };
    } catch (error) {
      keyVaultDetails = {
        connected: false,
        error: error.message,
        vaultUrl: process.env.AZURE_KEY_VAULT_URL
      };
    }

    // Detailed OpenAI check
    let openAIDetails = null;
    try {
      const initialized = await azureOpenAIClient.initialize();
      openAIDetails = {
        connected: initialized,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        hasApiKey: !!process.env.AZURE_OPENAI_API_KEY
      };
    } catch (error) {
      openAIDetails = {
        connected: false,
        error: error.message,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT
      };
    }

    // Application Insights check
    let appInsightsDetails = null;
    try {
      const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      appInsightsDetails = {
        configured: !!connectionString,
        connectionString: connectionString ? 'configured' : 'missing'
      };
    } catch (error) {
      appInsightsDetails = {
        configured: false,
        error: error.message
      };
    }

    // Azure AD B2C check
    let adB2CDetails = null;
    try {
      const tenantName = process.env.AZURE_AD_B2C_TENANT_NAME;
      const clientId = process.env.AZURE_AD_B2C_CLIENT_ID;
      const policyName = process.env.AZURE_AD_B2C_POLICY_NAME;
      
      adB2CDetails = {
        configured: !!(tenantName && clientId && policyName),
        tenantName: tenantName || 'not configured',
        hasClientId: !!clientId,
        policyName: policyName || 'not configured'
      };
    } catch (error) {
      adB2CDetails = {
        configured: false,
        error: error.message
      };
    }

    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Determine overall status
    const criticalServices = [azureHealth.database, azureHealth.storage];
    const isHealthy = criticalServices.every(service => service);
    const overallStatus = isHealthy ? 'healthy' : 'degraded';
    
    const healthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      azure: {
        region: process.env.AZURE_LOCATION || 'unknown',
        resourceGroup: process.env.AZURE_RESOURCE_GROUP || 'unknown',
        subscription: process.env.AZURE_SUBSCRIPTION_ID ? 'configured' : 'not configured'
      },
      services: {
        database: {
          status: azureHealth.database ? 'healthy' : 'unhealthy',
          type: 'Azure PostgreSQL Flexible Server'
        },
        storage: {
          status: azureHealth.storage ? 'healthy' : 'unhealthy',
          type: 'Azure Blob Storage',
          details: storageDetails
        },
        keyVault: {
          status: azureHealth.keyVault ? 'healthy' : 'degraded',
          type: 'Azure Key Vault',
          details: keyVaultDetails
        },
        openAI: {
          status: azureHealth.openai ? 'healthy' : 'degraded',
          type: 'Azure OpenAI Service',
          details: openAIDetails
        },
        applicationInsights: {
          status: appInsightsDetails.configured ? 'healthy' : 'not configured',
          type: 'Azure Application Insights',
          details: appInsightsDetails
        },
        adB2C: {
          status: adB2CDetails.configured ? 'healthy' : 'not configured',
          type: 'Azure AD B2C',
          details: adB2CDetails
        }
      },
      checks: {
        database: azureHealth.database ? 'pass' : 'fail',
        storage: azureHealth.storage ? 'pass' : 'fail',
        keyVault: azureHealth.keyVault ? 'pass' : 'warn',
        openai: azureHealth.openai ? 'pass' : 'warn',
        applicationInsights: appInsightsDetails.configured ? 'pass' : 'warn',
        adB2C: adB2CDetails.configured ? 'pass' : 'warn'
      }
    };

    // Set appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(healthResponse);
  } catch (error) {
    console.error('Azure services health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      azure: {
        region: process.env.AZURE_LOCATION || 'unknown',
        resourceGroup: process.env.AZURE_RESOURCE_GROUP || 'unknown'
      },
      checks: {
        database: 'fail',
        storage: 'fail',
        keyVault: 'fail',
        openai: 'fail',
        applicationInsights: 'fail',
        adB2C: 'fail'
      }
    });
  }
}
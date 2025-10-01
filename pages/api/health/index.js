// Health Check API Endpoint
// Provides comprehensive health status for Azure services

import { checkAzureServicesHealth } from '../../../azure/config/azure-config.js';
import { ServerMonitoring } from '../../../lib/monitoring';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();
    
    // Basic application health
    const appHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version
    };

    // Check Azure services
    const azureHealth = await checkAzureServicesHealth();
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Determine overall health status
    const isHealthy = azureHealth.database && azureHealth.storage;
    const overallStatus = isHealthy ? 'healthy' : 'degraded';
    
    // Prepare response
    const healthResponse = {
      status: overallStatus,
      timestamp: appHealth.timestamp,
      responseTime: `${responseTime}ms`,
      application: appHealth,
      azure: azureHealth,
      checks: {
        database: azureHealth.database ? 'pass' : 'fail',
        storage: azureHealth.storage ? 'pass' : 'fail',
        keyVault: azureHealth.keyVault ? 'pass' : 'warn',
        openai: azureHealth.openai ? 'pass' : 'warn'
      }
    };

    // Track health check metrics
    ServerMonitoring.trackServerEvent('health_check_completed', {
      status: overallStatus,
      responseTime,
      database: azureHealth.database,
      storage: azureHealth.storage,
      keyVault: azureHealth.keyVault,
      openai: azureHealth.openai
    });

    ServerMonitoring.trackServerMetric('health_check_response_time', responseTime);

    // Set appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(healthResponse);
  } catch (error) {
    console.error('Health check failed:', error);
    
    // Track health check failure
    ServerMonitoring.trackServerException(error, { 
      type: 'health_check_failure',
      timestamp: new Date().toISOString()
    });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: {
        database: 'fail',
        storage: 'fail',
        keyVault: 'fail',
        openai: 'fail'
      }
    });
  }
}
// Database Health Check API Endpoint
// Specific health check for Azure PostgreSQL database

import { azurePostgreSQLClient } from '../../../azure/config/azure-config.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();
    
    // Initialize database connection if needed
    await azurePostgreSQLClient.initialize();
    
    // Test basic connectivity
    const connectivityTest = await azurePostgreSQLClient.query('SELECT NOW() as current_time, version() as db_version');
    
    // Test table access
    const tableTest = await azurePostgreSQLClient.query('SELECT COUNT(*) as user_count FROM users');
    
    // Test function execution
    const functionTest = await azurePostgreSQLClient.query('SELECT current_user_id() as test_function');
    
    // Get database statistics
    const statsQuery = `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
      LIMIT 10
    `;
    const statsResult = await azurePostgreSQLClient.query(statsQuery);
    
    // Get active connections
    const connectionsQuery = `
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    const connectionsResult = await azurePostgreSQLClient.query(connectionsQuery);
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    const healthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: {
        connected: true,
        currentTime: connectivityTest.rows[0].current_time,
        version: connectivityTest.rows[0].db_version,
        userCount: parseInt(tableTest.rows[0].user_count),
        functionTest: functionTest.rows[0].test_function !== null,
        statistics: statsResult.rows,
        connections: connectionsResult.rows[0]
      },
      checks: {
        connectivity: 'pass',
        tableAccess: 'pass',
        functionExecution: 'pass',
        statistics: 'pass'
      }
    };

    res.status(200).json(healthResponse);
  } catch (error) {
    console.error('Database health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        connected: false,
        error: error.message
      },
      checks: {
        connectivity: 'fail',
        tableAccess: 'fail',
        functionExecution: 'fail',
        statistics: 'fail'
      }
    });
  }
}
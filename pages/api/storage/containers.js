import { azureStorage } from '../../../lib/azureStorage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  try {
    // Check authentication for admin operations
    const session = await getServerSession(req, res, authOptions);
    
    if (req.method === 'GET') {
      // Public endpoint for checking container status
      const healthCheck = await azureStorage.healthCheck();
      
      return res.status(200).json({
        status: healthCheck.status,
        message: healthCheck.message,
        containers: azureStorage.containers,
        timestamp: healthCheck.timestamp
      });
    }

    if (req.method === 'POST') {
      // Admin only - initialize containers
      if (!session || session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const result = await azureStorage.initializeContainers();
      
      return res.status(200).json({
        success: true,
        message: result.message,
        containers: azureStorage.containers
      });
    }

    if (req.method === 'DELETE') {
      // Admin only - cleanup operation
      if (!session || session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { containerName, fileName } = req.query;
      
      if (!containerName || !fileName) {
        return res.status(400).json({ error: 'Container name and file name required' });
      }

      const result = await azureStorage.deleteFile(containerName, fileName);
      
      return res.status(200).json({
        success: result.success,
        deleted: result.deleted,
        file: fileName,
        container: containerName
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Storage containers API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
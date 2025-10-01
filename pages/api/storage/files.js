import { azureStorage } from '../../../lib/azureStorage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { containerName, fileName, prefix } = req.query;

    if (req.method === 'GET') {
      if (fileName) {
        // Get specific file info
        if (!containerName) {
          return res.status(400).json({ error: 'Container name required' });
        }

        const fileExists = await azureStorage.fileExists(containerName, fileName);
        
        if (!fileExists) {
          return res.status(404).json({ error: 'File not found' });
        }

        const fileInfo = await azureStorage.getFileInfo(containerName, fileName);
        const secureUrl = azureStorage.getSecureUrl(containerName, fileName, 'r', 24);

        return res.status(200).json({
          ...fileInfo,
          secureUrl,
          exists: true
        });
      } else {
        // List files in container
        if (!containerName) {
          return res.status(400).json({ error: 'Container name required' });
        }

        const files = await azureStorage.listFiles(containerName, prefix || '');
        
        // Generate secure URLs for each file
        const filesWithSecureUrls = files.map(file => ({
          ...file,
          secureUrl: azureStorage.getSecureUrl(containerName, file.name, 'r', 24)
        }));

        return res.status(200).json({
          files: filesWithSecureUrls,
          container: containerName,
          count: filesWithSecureUrls.length
        });
      }
    }

    if (req.method === 'DELETE') {
      // Delete file
      if (!containerName || !fileName) {
        return res.status(400).json({ error: 'Container name and file name required' });
      }

      // Check if user owns the file or is admin
      const fileInfo = await azureStorage.getFileInfo(containerName, fileName);
      const isOwner = fileInfo.metadata?.uploadedBy === session.user.id;
      const isAdmin = session.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const result = await azureStorage.deleteFile(containerName, fileName);
      
      return res.status(200).json({
        success: result.success,
        deleted: result.deleted,
        file: fileName,
        container: containerName
      });
    }

    if (req.method === 'POST') {
      // Generate SAS token for specific file access
      const { permissions = 'r', expiryHours = 24 } = req.body;
      
      if (!containerName || !fileName) {
        return res.status(400).json({ error: 'Container name and file name required' });
      }

      const fileExists = await azureStorage.fileExists(containerName, fileName);
      
      if (!fileExists) {
        return res.status(404).json({ error: 'File not found' });
      }

      const sasToken = azureStorage.generateSASToken(containerName, fileName, permissions, expiryHours);
      const secureUrl = azureStorage.getSecureUrl(containerName, fileName, permissions, expiryHours);

      return res.status(200).json({
        sasToken,
        secureUrl,
        expiresAt: new Date(Date.now() + (expiryHours * 60 * 60 * 1000)).toISOString(),
        permissions
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Storage files API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
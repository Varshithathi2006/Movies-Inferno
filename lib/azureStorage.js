import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';

class AzureStorageClient {
  constructor() {
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    this.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!this.accountName || !this.accountKey) {
      console.warn('Azure Storage credentials not configured. Storage operations will be disabled.');
      this.isConfigured = false;
      return;
    }

    this.isConfigured = true;
    this.blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
    this.sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
    
    // Container names
    this.containers = {
      posters: 'movie-posters',
      backdrops: 'movie-backdrops',
      profiles: 'user-profiles',
      thumbnails: 'thumbnails',
      uploads: 'user-uploads'
    };
  }

  /**
   * Initialize storage containers
   */
  async initializeContainers() {
    if (!this.isConfigured) {
      throw new Error('Azure Storage not configured');
    }

    try {
      for (const [key, containerName] of Object.entries(this.containers)) {
        const containerClient = this.blobServiceClient.getContainerClient(containerName);
        
        // Create container if it doesn't exist
        const exists = await containerClient.exists();
        if (!exists) {
          await containerClient.create({
            access: 'blob' // Public read access for media files
          });
          console.log(`Created container: ${containerName}`);
        }
      }
      
      return { success: true, message: 'All containers initialized successfully' };
    } catch (error) {
      console.error('Error initializing containers:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Azure Blob Storage
   */
  async uploadFile(containerName, fileName, fileBuffer, contentType = 'application/octet-stream') {
    if (!this.isConfigured) {
      throw new Error('Azure Storage not configured');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: contentType,
          blobCacheControl: 'public, max-age=31536000' // Cache for 1 year
        },
        metadata: {
          uploadedAt: new Date().toISOString(),
          originalName: fileName
        }
      };

      const uploadResponse = await blockBlobClient.uploadData(fileBuffer, uploadOptions);
      
      return {
        success: true,
        url: blockBlobClient.url,
        etag: uploadResponse.etag,
        lastModified: uploadResponse.lastModified
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Generate a SAS token for secure access to a blob
   */
  generateSASToken(containerName, blobName, permissions = 'r', expiryHours = 24) {
    if (!this.isConfigured) {
      throw new Error('Azure Storage not configured');
    }

    try {
      const startsOn = new Date();
      const expiresOn = new Date(startsOn.getTime() + (expiryHours * 60 * 60 * 1000));

      const sasOptions = {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse(permissions),
        startsOn,
        expiresOn
      };

      const sasToken = generateBlobSASQueryParameters(sasOptions, this.sharedKeyCredential);
      return sasToken.toString();
    } catch (error) {
      console.error('Error generating SAS token:', error);
      throw error;
    }
  }

  /**
   * Get a secure URL for a blob with SAS token
   */
  getSecureUrl(containerName, blobName, permissions = 'r', expiryHours = 24) {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const sasToken = this.generateSASToken(containerName, blobName, permissions, expiryHours);
      const blobUrl = `https://${this.accountName}.blob.core.windows.net/${containerName}/${blobName}`;
      return `${blobUrl}?${sasToken}`;
    } catch (error) {
      console.error('Error getting secure URL:', error);
      return null;
    }
  }

  /**
   * Delete a blob from storage
   */
  async deleteFile(containerName, fileName) {
    if (!this.isConfigured) {
      throw new Error('Azure Storage not configured');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);
      
      const deleteResponse = await blockBlobClient.deleteIfExists();
      
      return {
        success: deleteResponse.succeeded,
        deleted: deleteResponse.succeeded
      };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * List blobs in a container
   */
  async listFiles(containerName, prefix = '') {
    if (!this.isConfigured) {
      throw new Error('Azure Storage not configured');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blobs = [];

      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        blobs.push({
          name: blob.name,
          url: `https://${this.accountName}.blob.core.windows.net/${containerName}/${blob.name}`,
          lastModified: blob.properties.lastModified,
          contentLength: blob.properties.contentLength,
          contentType: blob.properties.contentType
        });
      }

      return blobs;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Check if a blob exists
   */
  async fileExists(containerName, fileName) {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);
      
      return await blockBlobClient.exists();
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  /**
   * Get blob properties and metadata
   */
  async getFileInfo(containerName, fileName) {
    if (!this.isConfigured) {
      throw new Error('Azure Storage not configured');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(fileName);
      
      const properties = await blockBlobClient.getProperties();
      
      return {
        url: blockBlobClient.url,
        lastModified: properties.lastModified,
        contentLength: properties.contentLength,
        contentType: properties.contentType,
        etag: properties.etag,
        metadata: properties.metadata
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  }

  /**
   * Health check for Azure Storage
   */
  async healthCheck() {
    if (!this.isConfigured) {
      return {
        status: 'unhealthy',
        message: 'Azure Storage not configured',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // Try to list containers to test connectivity
      const containers = [];
      for await (const container of this.blobServiceClient.listContainers()) {
        containers.push(container.name);
      }

      return {
        status: 'healthy',
        message: 'Azure Storage is accessible',
        containers: containers.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create and export a singleton instance
export const azureStorage = new AzureStorageClient();

// Export the class for testing or custom instances
export { AzureStorageClient };
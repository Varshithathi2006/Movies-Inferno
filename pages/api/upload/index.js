import { azureStorage } from '../../../lib/azureStorage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Allowed file types and sizes
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  document: ['application/pdf', 'text/plain']
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse the form data
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const uploadType = Array.isArray(fields.type) ? fields.type[0] : fields.type || 'uploads';
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate file type
    const fileType = file.mimetype;
    const isValidType = Object.values(ALLOWED_TYPES).some(types => 
      types.includes(fileType)
    );

    if (!isValidType) {
      return res.status(400).json({ 
        error: 'Invalid file type',
        allowedTypes: ALLOWED_TYPES
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalFilename || '');
    const fileName = `${session.user.id}_${timestamp}_${randomString}${extension}`;

    // Read file buffer
    const fileBuffer = fs.readFileSync(file.filepath);

    // Determine container based on upload type
    let containerName;
    switch (uploadType) {
      case 'profile':
        containerName = azureStorage.containers.profiles;
        break;
      case 'poster':
        containerName = azureStorage.containers.posters;
        break;
      case 'backdrop':
        containerName = azureStorage.containers.backdrops;
        break;
      default:
        containerName = azureStorage.containers.uploads;
    }

    // Upload to Azure Blob Storage
    const uploadResult = await azureStorage.uploadFile(
      containerName,
      fileName,
      fileBuffer,
      fileType
    );

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    // Generate secure URL with SAS token (valid for 24 hours)
    const secureUrl = azureStorage.getSecureUrl(containerName, fileName, 'r', 24);

    res.status(200).json({
      success: true,
      file: {
        name: fileName,
        originalName: file.originalFilename,
        size: file.size,
        type: fileType,
        url: uploadResult.url,
        secureUrl: secureUrl,
        container: containerName,
        uploadedAt: new Date().toISOString(),
        uploadedBy: session.user.id
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large',
        maxSize: MAX_FILE_SIZE
      });
    }

    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message
    });
  }
}
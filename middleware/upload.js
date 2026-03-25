const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
const postsDir = path.join(uploadsDir, 'posts');
const avatarsDir = path.join(uploadsDir, 'avatars');

[uploadsDir, postsDir, avatarsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine destination based on file type
    if (req.uploadType === 'avatar') {
      cb(null, avatarsDir);
    } else {
      cb(null, postsDir);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = req.uploadType === 'avatar' ? 'avatar' : 'post';
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept only images
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 1 // Only 1 file per upload
  }
});

// Middleware to set upload type
const setUploadType = (type) => {
  return (req, res, next) => {
    req.uploadType = type;
    next();
  };
};

// Error handler for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only 1 file allowed per upload.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

// Delete file helper
const deleteFile = (filename, type = 'post') => {
  return new Promise((resolve, reject) => {
    const dir = type === 'avatar' ? avatarsDir : postsDir;
    const filepath = path.join(dir, filename);
    
    fs.unlink(filepath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // File doesn't exist, resolve anyway
          resolve(false);
        } else {
          reject(err);
        }
      } else {
        resolve(true);
      }
    });
  });
};

// Get file URL helper
const getFileUrl = (filename, type = 'post') => {
  if (!filename) return null;
  const folder = type === 'avatar' ? 'avatars' : 'posts';
  return `/uploads/${folder}/${filename}`;
};

// Extract filename from URL
const getFilenameFromUrl = (url) => {
  if (!url) return null;
  return path.basename(url);
};

module.exports = {
  upload,
  setUploadType,
  handleUploadError,
  deleteFile,
  getFileUrl,
  getFilenameFromUrl,
  uploadsDir,
  postsDir,
  avatarsDir
};

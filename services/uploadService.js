const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;

const UPLOAD_DIR = 'uploads';

(async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
  }
})();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${file.fieldname}_${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: fileFilter
});

class UploadService {
  static getMulterUpload() {
    return upload;
  }

  static async uploadToS3(file, userId, type = 'profile') {
    return `/uploads/${file.filename}`;
  }

  static async uploadToFirebase(file, userId, type = 'profile') {
    return `/uploads/${file.filename}`;
  }

  static async uploadImage(file, userId, type = 'profile') {
    const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
    const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

    if (AWS_ACCESS_KEY_ID) {
      return this.uploadToS3(file, userId, type);
    } else if (FIREBASE_PROJECT_ID) {
      return this.uploadToFirebase(file, userId, type);
    } else {
      return `/uploads/${file.filename}`;
    }
  }

  static getPublicUrl(filePath) {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}${filePath}`;
  }
}

module.exports = UploadService;


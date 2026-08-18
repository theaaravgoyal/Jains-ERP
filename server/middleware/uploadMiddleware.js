const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the profile-pictures directory exists
const profilePicturesDir = path.join(__dirname, '../uploads/profile-pictures');
if (!fs.existsSync(profilePicturesDir)) {
  fs.mkdirSync(profilePicturesDir, { recursive: true });
}

// Multer disk storage — saves file to /uploads/profile-pictures/<employeeId>-<timestamp>.<ext>
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePicturesDir);
  },
  filename: (req, file, cb) => {
    const employeeId = req.employee?._id || req.user?._id || 'unknown';
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${employeeId}-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

// Only allow image file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'));
};

// Max 5 MB per upload
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = upload;

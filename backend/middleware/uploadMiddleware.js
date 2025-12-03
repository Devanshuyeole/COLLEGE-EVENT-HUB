const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create directories
const eventsDir = path.join(__dirname, '../uploads/events');
const profilesDir = path.join(__dirname, '../uploads/profiles');

if (!fs.existsSync(eventsDir)) {
  fs.mkdirSync(eventsDir, { recursive: true });
}
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on field name
    if (file.fieldname === 'profilePhoto') {
      cb(null, profilesDir);
    } else {
      cb(null, eventsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = file.fieldname === 'profilePhoto' ? 'profile-' : 'event-';
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = upload;

const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PYTHON_API_URL = 'http://127.0.0.1:5001/predict';
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
}).single('image');

const uploadImage = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // File details
    const filePath = req.file.path;
    const imageType = req.body.imageType || 'crop';

    try {
      // 1. Prepare form data for Python API
      const form = new FormData();
      form.append('image', fs.createReadStream(filePath));
      form.append('imageType', imageType);

      // 2. Call Python ML API with timeout
      const response = await fetch(PYTHON_API_URL, {
        method: 'POST',
        body: form,
        timeout: 30000 // 30 second timeout
      });

      // 3. Process response from Python API
      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle error response from Python API
        return res.status(response.status || 500).json({ 
          success: false, 
          message: data.message || 'ML prediction failed' 
        });
      }

      // 4. Return success response with prediction
      res.json({
        success: true,
        message: data.message,
        filename: data.filename,
        imageType: data.imageType,
        detection: data.detection
      });

    } catch (error) {
      console.error('Python API Communication Error:', error);
      res.status(500).json({
        success: false,
        message: 'Could not communicate with the ML analysis service. Make sure the Python API is running on port 5001.'
      });
    } finally {
      // 5. Clean up local file after processing
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });
};

module.exports = {
  uploadImage
};
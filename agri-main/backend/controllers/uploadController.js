const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
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
  upload(req, res, (err) => {
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

    const { imageType } = req.body; // 'crop' or 'animal'

    // Simulate disease detection (you would integrate with your ML model here)
    const detectionResult = simulateDiseaseDetection(imageType, req.file.filename);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      filename: req.file.filename,
      imageType: imageType,
      detection: detectionResult
    });
  });
};

const simulateDiseaseDetection = (imageType, filename) => {
  // This is a simulation - replace with actual ML model integration
  const cropDiseases = [
    { disease: 'Leaf Rust', confidence: 0.85, treatment: 'Apply fungicide and remove affected leaves' },
    { disease: 'Powdery Mildew', confidence: 0.72, treatment: 'Improve air circulation and apply sulfur-based fungicide' },
    { disease: 'Blight', confidence: 0.68, treatment: 'Remove infected plants and apply copper fungicide' },
    { disease: 'Healthy', confidence: 0.95, treatment: 'No action needed' }
  ];

  const animalDiseases = [
    { disease: 'Foot Rot', confidence: 0.78, treatment: 'Isolate animal and consult veterinarian' },
    { disease: 'Mastitis', confidence: 0.82, treatment: 'Antibiotic treatment and proper milking hygiene' },
    { disease: 'Healthy', confidence: 0.92, treatment: 'No action needed' }
  ];

  const diseases = imageType === 'crop' ? cropDiseases : animalDiseases;
  const randomDisease = diseases[Math.floor(Math.random() * diseases.length)];

  return {
    detected: randomDisease.disease !== 'Healthy',
    disease: randomDisease.disease,
    confidence: randomDisease.confidence,
    treatment: randomDisease.treatment,
    message: randomDisease.disease === 'Healthy' 
      ? `The ${imageType} appears healthy!` 
      : `Possible ${randomDisease.disease} detected (${(randomDisease.confidence * 100).toFixed(1)}% confidence)`
  };
};

module.exports = {
  uploadImage
};
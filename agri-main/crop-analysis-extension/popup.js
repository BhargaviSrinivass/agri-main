// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const analyzeBtn = document.getElementById('analyzeBtn');
const changeImage = document.getElementById('changeImage');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const resultCard = document.getElementById('resultCard');
const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const resultStatus = document.getElementById('resultStatus');
const resultConfidence = document.getElementById('resultConfidence');
const resultTreatment = document.getElementById('resultTreatment');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');

let currentFile = null;

// Event listeners
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
analyzeBtn.addEventListener('click', analyzeImage);
changeImage.addEventListener('click', resetUpload);

// File handling
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    processFile(file);
  }
}

function handleDragOver(event) {
  event.preventDefault();
  uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
  event.preventDefault();
  uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
  event.preventDefault();
  uploadArea.classList.remove('dragover');
  
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    processFile(file);
  }
}

function processFile(file) {
  currentFile = file;
  
  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    uploadArea.style.display = 'none';
    imagePreview.style.display = 'block';
    hideResults();
    hideError();
  };
  reader.readAsDataURL(file);
}

function resetUpload() {
  currentFile = null;
  fileInput.value = '';
  imagePreview.style.display = 'none';
  uploadArea.style.display = 'block';
  hideResults();
  hideError();
}

// Analysis functions
async function analyzeImage() {
  if (!currentFile) return;
  
  showLoading();
  hideResults();
  hideError();
  
  try {
    const formData = new FormData();
    formData.append('image', currentFile);
    formData.append('imageType', 'crop');
    
    const response = await fetch('http://127.0.0.1:5001/predict', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      displayResults(data);
    } else {
      throw new Error(data.message || 'Analysis failed');
    }
    
  } catch (err) {
    showError(err.message);
  } finally {
    hideLoading();
  }
}

function displayResults(data) {
  const detection = data.detection;
  const isDisease = detection.detected;
  
  // Update UI based on results
  resultIcon.textContent = isDisease ? '⚠️' : '✅';
  resultTitle.textContent = isDisease ? 'Disease Detected' : 'Healthy Plant';
  resultStatus.textContent = detection.disease;
  resultConfidence.textContent = `${(detection.confidence * 100).toFixed(1)}%`;
  resultTreatment.textContent = detection.treatment;
  
  // Style based on result
  resultCard.className = isDisease ? 'result-card disease' : 'result-card';
  
  results.style.display = 'block';
}

function showLoading() {
  loading.style.display = 'block';
  analyzeBtn.disabled = true;
}

function hideLoading() {
  loading.style.display = 'none';
  analyzeBtn.disabled = false;
}

function showError(message) {
  errorMessage.textContent = message;
  error.style.display = 'block';
}

function hideError() {
  error.style.display = 'none';
}

function hideResults() {
  results.style.display = 'none';
}

// Initialize
hideResults();
hideError();
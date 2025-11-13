// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const analyzeFileBtn = document.getElementById('analyzeFileBtn');
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

// NEW DOM elements for URL feature
const urlInputArea = document.getElementById('urlInputArea');
const imageUrlInput = document.getElementById('imageUrlInput');
const analyzeUrlBtn = document.getElementById('analyzeUrlBtn');
const toggleUploadBtn = document.getElementById('toggleUploadBtn');
const toggleUrlBtn = document.getElementById('toggleUrlBtn'); // Button inside upload area

let currentFile = null;

// Event listeners
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);

analyzeFileBtn.addEventListener('click', () => analyzeImage(currentFile));

changeImage.addEventListener('click', resetUpload);

// NEW URL event listeners
analyzeUrlBtn.addEventListener('click', handleUrlAnalysis);
toggleUploadBtn.addEventListener('click', () => toggleView('file')); // Switch URL view back to file
toggleUrlBtn.addEventListener('click', (e) => { // Switch file view to URL
  e.stopPropagation(); // Prevent uploadArea click event from firing
  toggleView('url');
});

// --- View Management ---
/**
 * Switches the primary view between 'file' upload and 'url' input.
 * @param {'file' | 'url'} mode 
 */
function toggleView(mode) {
  hideResults();
  hideError();
  currentFile = null;
  fileInput.value = '';
  imagePreview.style.display = 'none';

  if (mode === 'file') {
    urlInputArea.style.display = 'none';
    uploadArea.style.display = 'block';
  } else { // mode === 'url'
    uploadArea.style.display = 'none';
    urlInputArea.style.display = 'block';
  }
}

// --- File Handling (Existing) ---
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    processFile(file);
  }
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
  event.preventDefault();
  uploadArea.classList.remove('dragover');
}

// ** MODIFIED handleDrop for Q1 fix (URL drag) **
function handleDrop(event) {
  event.preventDefault();
  uploadArea.classList.remove('dragover');
  
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    // 1. File dropped from local system
    processFile(file);
    return;
  }

  // 2. Try to get a URL from drag-and-drop (e.g., dragging from Google Images)
  const imageUrl = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain');
  
  if (imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('https'))) {
    // Switch to URL view, populate the input, and let the user click analyze
    toggleView('url');
    // Sanitize the URL by taking the first one if multiple are in the uri-list
    imageUrlInput.value = imageUrl.split('\n')[0].trim();
    showError('Image URL detected from drop. Click "Analyze URL" to process.');
    return;
  }
  
  showError('Drop failed. Please drop a local image file or use the URL input.');
}

function processFile(file) {
  currentFile = file;
  
  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    // Hide upload area, show preview
    uploadArea.style.display = 'none';
    urlInputArea.style.display = 'none'; // Ensure URL area is hidden
    imagePreview.style.display = 'block';
    hideResults();
    hideError();
  };
  reader.readAsDataURL(file);
}

function resetUpload() {
  toggleView('file'); // Reset back to file upload view
}

// --- URL Analysis (NEW FEATURE Q2) ---
async function handleUrlAnalysis() {
  const url = imageUrlInput.value.trim();
  if (!url) {
    showError('Please enter a valid image URL.');
    return;
  }
  
  showLoading();
  hideResults();
  hideError();
  
  try {
    // 1. Fetch the image from the URL (Subject to CORS)
    const imageResponse = await fetch(url, { mode: 'cors' });
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from URL: ${imageResponse.status} (${imageResponse.statusText}). Check if the image server supports CORS.`);
    }
    
    // 2. Convert to Blob
    const imageBlob = await imageResponse.blob();
    
    // 3. Create a File object (needed for consistent FormData)
    const urlObj = new URL(url);
    const urlParts = urlObj.pathname.split('/');
    const fileName = urlParts[urlParts.length - 1] || 'image_from_url.jpg';
    
    const fileToAnalyze = new File([imageBlob], fileName, { type: imageBlob.type });

    // 4. Analyze the created file
    await analyzeImage(fileToAnalyze);

  } catch (err) {
    showError(err.message);
  } finally {
    hideLoading();
  }
}

// --- Analysis functions (Refactored) ---
/**
 * Sends the image file to the local prediction server.
 * @param {File} fileToAnalyze 
 */
async function analyzeImage(fileToAnalyze) {
  if (!fileToAnalyze) return;

  // Only manage loading/error state if called by the local file button
  const manageStateExternally = (fileToAnalyze !== currentFile); 
  
  if (!manageStateExternally) {
    showLoading();
    hideResults();
    hideError();
  }
  
  try {
    const formData = new FormData();
    formData.append('image', fileToAnalyze);
    // 🚨 CHANGE: Update imageType for livestock model
    formData.append('imageType', 'livestock');
    
    // 🚨 CHANGE: Update port to 5002 for livestock model
    const response = await fetch('http://127.0.0.1:5002/predict', {
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
    if (manageStateExternally) {
      throw err; // Let the caller (handleUrlAnalysis) manage the error
    } else {
      showError(err.message);
    }
  } finally {
    if (!manageStateExternally) {
      hideLoading();
    }
  }
}

function displayResults(data) {
  const detection = data.detection;
  const isDisease = detection.detected;
  
  // Update UI based on results
  resultIcon.textContent = isDisease ? '⚠️' : '✅';
  // 🚨 CHANGE: Update text from 'Healthy Plant' to 'Healthy Animal'
  resultTitle.textContent = isDisease ? 'Disease Detected' : 'Healthy Animal';
  resultStatus.textContent = detection.disease;
  resultConfidence.textContent = `${(detection.confidence * 100).toFixed(1)}%`;
  resultTreatment.textContent = detection.treatment;
  
  // Style based on result
  resultCard.className = isDisease ? 'result-card disease' : 'result-card';
  
  results.style.display = 'block';
}

function showLoading() {
  loading.style.display = 'block';
  analyzeFileBtn.disabled = true;
  analyzeUrlBtn.disabled = true;
}

function hideLoading() {
  loading.style.display = 'none';
  analyzeFileBtn.disabled = false;
  analyzeUrlBtn.disabled = false;
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

// Initialize: Start with File Upload view
hideResults();
hideError();
toggleView('file');
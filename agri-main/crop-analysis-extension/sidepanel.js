// DOM elements for sidebar
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileUploadBtn = document.getElementById('fileUploadBtn');
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
const imageUrlInput = document.getElementById('imageUrlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const clearUrlBtn = document.getElementById('clearUrlBtn');

let currentFile = null;

// Event listeners
fileUploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
analyzeBtn.addEventListener('click', analyzeImage);
changeImage.addEventListener('click', resetUpload);
loadUrlBtn.addEventListener('click', loadImageFromUrl);
clearUrlBtn.addEventListener('click', () => imageUrlInput.value = '');

// Enhanced drag and drop for web images
function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  uploadArea.classList.add('dragover');
  event.dataTransfer.dropEffect = 'copy';
}

function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  uploadArea.classList.remove('dragover');
  
  console.log('Drop event:', event.dataTransfer.types);
  
  // Handle files from computer
  if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
      return;
    }
  }
  
  // Handle images dragged from web pages
  handleWebImageDrop(event);
}

async function handleWebImageDrop(event) {
  try {
    // Get the image URL from various data types
    const imageUrl = event.dataTransfer.getData('text/uri-list') || 
                     event.dataTransfer.getData('text/plain') ||
                     event.dataTransfer.getData('URL');

    console.log('Dragged image URL:', imageUrl);

    if (imageUrl && isImageUrl(imageUrl)) {
      await processImageUrl(imageUrl);
      return;
    }

    // Check for HTML content that might contain images
    const htmlData = event.dataTransfer.getData('text/html');
    if (htmlData) {
      const imgSrc = extractImageFromHtml(htmlData);
      if (imgSrc) {
        console.log('Extracted image from HTML:', imgSrc);
        await processImageUrl(imgSrc);
        return;
      }
    }

    throw new Error('No valid image found. Try dragging the image directly from the website.');

  } catch (err) {
    showError(err.message);
  }
}

// File handling
function handleFileSelect(event) {
  const file = event.target.files[0];
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

// URL image handling
async function loadImageFromUrl() {
  const url = imageUrlInput.value.trim();
  if (!url) return;
  
  if (!isImageUrl(url)) {
    showError('Please enter a valid image URL (jpg, png, gif, etc.)');
    return;
  }
  
  await processImageUrl(url);
}

async function processImageUrl(imageUrl) {
  showLoading();
  
  try {
    // Handle data URLs
    if (imageUrl.startsWith('data:')) {
      previewImage.src = imageUrl;
      currentFile = dataURLtoFile(imageUrl, 'dropped-image.png');
    } else {
      // Handle regular URLs - fetch and convert to File object
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      currentFile = new File([blob], 'web-image.jpg', { type: blob.type });
      
      // Create object URL for preview
      previewImage.src = URL.createObjectURL(blob);
    }
    
    uploadArea.style.display = 'none';
    imagePreview.style.display = 'block';
    hideResults();
    hideError();
    imageUrlInput.value = ''; // Clear URL input
    
  } catch (err) {
    showError('Failed to load image: ' + err.message);
  } finally {
    hideLoading();
  }
}

// Helper functions
function isImageUrl(url) {
  return /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?.*)?$/i.test(url) || 
         url.startsWith('data:image/');
}

function extractImageFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const img = doc.querySelector('img');
  return img ? img.src : null;
}

function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
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
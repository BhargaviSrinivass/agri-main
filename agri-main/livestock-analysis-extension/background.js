// Background script for extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Livestock Disease Analyzer extension installed');
  
  // Create context menu
  chrome.contextMenus.create({
    id: "analyzeImage",
    title: "Analyze this image with Livestock Analyzer",
    contexts: ["image"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "analyzeImage" && info.srcUrl) {
    console.log('Analyzing image:', info.srcUrl);
    
    try {
      // Show loading notification
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Livestock Analyzer',
        message: 'Analyzing image...'
      });

      // Process the image URL and send to your model
      const result = await processImageForAnalysis(info.srcUrl);
      
      // Show results notification
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Analysis Complete',
        message: `Result: ${result.disease} (${(result.confidence * 100).toFixed(1)}% confidence)`
      });

      // You could also open a results page or update the extension badge
      console.log('Analysis result:', result);

    } catch (error) {
      console.error('Analysis failed:', error);
      
      // Show error notification
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Analysis Failed',
        message: error.message || 'Could not analyze image'
      });
    }
  }
});

// Process image URL and send to your model
async function processImageForAnalysis(imageUrl) {
  try {
    console.log('Processing image URL:', imageUrl);
    
    // Convert Google Images URL to direct image URL if needed
    const directImageUrl = await convertToDirectImageUrl(imageUrl);
    console.log('Direct image URL:', directImageUrl);
    
    // Fetch the image and convert to blob
    const response = await fetch(directImageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log('Image blob:', blob);
    
    // Check if the image type is supported
    if (!blob.type.startsWith('image/')) {
      throw new Error('Unsupported image format');
    }
    
    // Convert to File object for FormData
    const file = new File([blob], 'analysis-image.jpg', { type: blob.type });
    
    // Send to your model
    const formData = new FormData();
    formData.append('image', file);
    // 🚨 CHANGE: Update imageType for livestock model
    formData.append('imageType', 'livestock');
    
    // 🚨 CHANGE: Update port to 5002 for livestock model
    const modelResponse = await fetch('http://127.0.0.1:5002/predict', {
      method: 'POST',
      body: formData
    });
    
    if (!modelResponse.ok) {
      throw new Error(`Model API error: ${modelResponse.status}`);
    }
    
    const result = await modelResponse.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Analysis failed');
    }
    
    return result.detection;
    
  } catch (error) {
    console.error('Error in processImageForAnalysis:', error);
    throw error;
  }
}

// Convert Google Images URL to direct image URL
async function convertToDirectImageUrl(url) {
  try {
    // If it's already a direct image URL, return as is
    if (url.startsWith('data:image/') || 
        url.match(/\.(jpg|jpeg|png|webp|gif|bmp)(\?.*)?$/i)) {
      return url;
    }
    
    // For Google Images, we need to handle their proxy URLs
    // Try to extract the original image URL from Google's proxy
    const urlObj = new URL(url);
    
    // Handle Google Images proxy URLs
    if (urlObj.hostname.includes('google.com') || urlObj.searchParams.has('imgurl')) {
      const directUrl = urlObj.searchParams.get('imgurl');
      if (directUrl) {
        return directUrl;
      }
    }
    
    // If we can't extract a direct URL, try to use the original URL
    // Some sites will still serve the image
    return url;
    
  } catch (error) {
    console.warn('Could not convert URL, using original:', error);
    return url;
  }
}
// Open side panel when extension icon is clicked (in addition to existing functionality)
chrome.action.onClicked.addListener((tab) => {
  // This will open the sidebar while keeping your popup.html as default
  chrome.sidePanel.open({ windowId: tab.windowId });
});
// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeImage') {
    analyzeImage(request.imageData)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function analyzeImage(imageData) {
  return null;
}
// Content script to interact with web pages
console.log('Crop Disease Analyzer content script loaded');

// Listen for right-clicks on images to get better URL data
document.addEventListener('contextmenu', (event) => {
  if (event.target.tagName === 'IMG') {
    const img = event.target;
    console.log('Right-clicked image:', img.src);
    
    // Try to get the best possible image URL
    let bestUrl = img.src;
    
    // For Google Images, try to get higher resolution versions
    if (img.src.includes('google.com')) {
      // Check for data-src or other attributes that might have better quality
      bestUrl = img.getAttribute('data-src') || 
                img.getAttribute('data-iurl') || 
                img.src;
    }
    
    // Store the best URL for the background script to use
    chrome.storage.local.set({ lastRightClickedImage: bestUrl });
  }
});

// You can also add functionality to analyze images on web pages
// For example: right-click context menu integration
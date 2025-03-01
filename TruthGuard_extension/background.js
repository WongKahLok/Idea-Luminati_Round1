// background.js - Background script
// Initialize storage values if not set
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.get(['scannedCount', 'alertCount', 'autoScan'], function(data) {
    if (data.scannedCount === undefined) {
      chrome.storage.local.set({scannedCount: 0});
    }
    if (data.alertCount === undefined) {
      chrome.storage.local.set({alertCount: 0});
    }
    if (data.autoScan === undefined) {
      chrome.storage.local.set({autoScan: true});
    }
  });
});

// You'll need these placeholder images for the extension to work properly:
// - images/icon16.png (16x16)
// - images/icon48.png (48x48)
// - images/icon128.png (128x128)
// - images/logo.png (for the popup)
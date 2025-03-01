document.addEventListener('DOMContentLoaded', function() {
  // Load stats from storage
  chrome.storage.local.get(['scannedCount', 'alertCount'], function(data) {
    document.getElementById('scanned-count').textContent = data.scannedCount || 0;
    document.getElementById('alert-count').textContent = data.alertCount || 0;
  });

  // Load auto-scan setting
  chrome.storage.local.get(['autoScan'], function(data) {
    // Default to true if not set
    const autoScan = data.autoScan === undefined ? true : data.autoScan;
    document.getElementById('auto-scan').checked = autoScan;
  });

  // Handle manual scan button click
  document.getElementById('scan-page').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "manualScan"});
    });
  });

  // Handle auto-scan toggle
  document.getElementById('auto-scan').addEventListener('change', function(e) {
    chrome.storage.local.set({autoScan: e.target.checked});
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "updateAutoScan", 
        autoScan: e.target.checked
      });
    });
  });
});
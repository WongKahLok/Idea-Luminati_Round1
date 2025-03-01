// content.js - Main content script for analyzing pages
// Database of fake news patterns and verified alternatives
const fakeNewsDatabase = {
  patterns: [
    { 
      keywords: ["microchip", "the", "5G", "Bill Gates"],
      threshold: 1,
      reason: "Contains conspiracy theory indicators about vaccines and technology"
    },
    { 
      keywords: ["miracle cure", "doctors hate", "big pharma doesn't want you to know"],
      threshold: 1,
      reason: "Uses sensationalist health claims language"
    },
    {
      keywords: ["shocking truth", "what they don't want you to know", "government cover-up", "mainstream media won't tell you"],
      threshold: 1,
      reason: "Uses conspiracy theory framing language"
    },
    {
      keywords: ["anonymous sources", "unnamed officials", "some experts say", "people are saying"],
      threshold: 2,
      reason: "Relies on vague attribution without specific sources"
    }
  ],
  // Map of fake news topics to verified alternative sources
  verifiedSources: {
    "vaccines": [
      {
        url: "https://www.who.int/news-room/questions-and-answers/item/vaccines-and-immunization-what-is-vaccination",
        title: "WHO: Vaccines and Immunization"
      },
      {
        url: "https://www.cdc.gov/vaccines/index.html",
        title: "CDC: Vaccines and Preventable Diseases"
      }
    ],
    "climate": [
      {
        url: "https://climate.nasa.gov/evidence/",
        title: "NASA: Climate Change Evidence"
      },
      {
        url: "https://www.ipcc.ch/",
        title: "IPCC: Climate Change Science"
      }
    ],
    "health": [
      {
        url: "https://www.nih.gov/health-information",
        title: "NIH: Health Information"
      },
      {
        url: "https://medlineplus.gov/",
        title: "MedlinePlus: Trusted Health Information"
      }
    ],
    "politics": [
      {
        url: "https://apnews.com/hub/politics",
        title: "Associated Press: Politics News"
      },
      {
        url: "https://www.reuters.com/world/",
        title: "Reuters: World News"
      }
    ],
    "general": [
      {
        url: "https://www.factcheck.org/",
        title: "FactCheck.org"
      },
      {
        url: "https://www.snopes.com/",
        title: "Snopes Fact Checking"
      }
    ]
  }
};

// Known unreliable sources
const unreliableDomains = [
  "fakesciencenews.org",
  "totallyrealnews.com",
  "conspiracyreport.net",
  "thetruthrevolution.info"
];

// Initialize state
let autoScan = true;
let scannedCount = 0;
let alertCount = 0;

// Load saved settings
chrome.storage.local.get(['autoScan', 'scannedCount', 'alertCount'], function(data) {
  // Default auto-scan to true if not set
  autoScan = data.autoScan === undefined ? true : data.autoScan;
  scannedCount = data.scannedCount || 0;
  alertCount = data.alertCount || 0;
});

// Main function to analyze page content
function analyzePageContent() {
  // Get the article text
  const articleText = extractArticleText();
  
  // Check if we're on a news site
  if (!isNewsSite()) {
    return;
  }
  
  // Update scan count
  scannedCount++;
  chrome.storage.local.set({ scannedCount: scannedCount });
  
  // Check current domain against known unreliable sources
  const currentDomain = window.location.hostname;
  const isUnreliableDomain = unreliableDomains.some(domain => 
    currentDomain.includes(domain)
  );
  
  if (isUnreliableDomain) {
    showAlert("This website is known for publishing misleading information", 
              ["This domain is in our database of unreliable sources"], 
              findRelevantAlternatives(articleText));
    return;
  }
  
  // If not an unreliable domain, analyze content
  let matchedPatterns = [];
  
  // Check content against patterns
  fakeNewsDatabase.patterns.forEach(pattern => {
    let matchCount = 0;
    
    pattern.keywords.forEach(keyword => {
      if (articleText.toLowerCase().includes(keyword.toLowerCase())) {
        matchCount++;
      }
    });
    
    if (matchCount >= pattern.threshold) {
      matchedPatterns.push(pattern.reason);
    }
  });
  
  // If suspicious patterns were found, show alert
  if (matchedPatterns.length > 0) {
    alertCount++;
    chrome.storage.local.set({ alertCount: alertCount });
    
    showAlert(
      "This article may contain misleading information", 
      matchedPatterns, 
      findRelevantAlternatives(articleText)
    );
  }
}

// Extract the main article text from the page
function extractArticleText() {
  // Try to find the article content using common selectors
  const selectors = [
    'article',
    '.article-body',
    '.article-content',
    '.story-body',
    '.entry-content',
    '.post-content',
    'main'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.textContent;
    }
  }
  
  // Fallback: get all paragraph text
  const paragraphs = document.querySelectorAll('p');
  return Array.from(paragraphs).map(p => p.textContent).join(' ');
}

// Check if the current site is a news site
function isNewsSite() {
  const newsPatterns = [
    'news', 'article', 'times', 'post', 'herald', 'tribune', 
    'journal', 'gazette', 'chronicle', 'star', 'daily', 
    'guardian', 'observer', 'bbc', 'cnn', 'reuters', 'ap', 
    'bloomberg', 'economist', 'politico', 'atlantic'
  ];
  
  const domain = window.location.hostname.toLowerCase();
  
  return newsPatterns.some(pattern => domain.includes(pattern));
}

// Find relevant alternative sources based on article content
function findRelevantAlternatives(text) {
  const textLower = text.toLowerCase();
  
  // Check if the content matches any of our categories
  if (textLower.includes('vaccin') || textLower.includes('immuniz') || textLower.includes('shot')) {
    return fakeNewsDatabase.verifiedSources.vaccines;
  } else if (textLower.includes('climate') || textLower.includes('global warming') || textLower.includes('carbon')) {
    return fakeNewsDatabase.verifiedSources.climate;
  } else if (textLower.includes('treatment') || textLower.includes('cure') || textLower.includes('health') || textLower.includes('disease')) {
    return fakeNewsDatabase.verifiedSources.health;
  } else if (textLower.includes('election') || textLower.includes('president') || textLower.includes('congress') || textLower.includes('government')) {
    return fakeNewsDatabase.verifiedSources.politics;
  }
  
  // Default to general fact-checking sources
  return fakeNewsDatabase.verifiedSources.general;
}

// Create and show the alert popup
function showAlert(message, reasons, alternatives) {
  // Remove any existing alerts
  const existingAlert = document.querySelector('.truthguard-alert');
  if (existingAlert) {
    existingAlert.remove();
  }
  
  // Create alert element
  const alertElement = document.createElement('div');
  alertElement.className = 'truthguard-alert';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'truthguard-header';
  
  // Add logo placeholder (in a real extension, you'd have an actual logo)
  const logo = document.createElement('div');
  logo.className = 'truthguard-logo';
  logo.textContent = '!'; // Placeholder for icon
  logo.style.backgroundColor = '#e74c3c';
  logo.style.color = 'white';
  logo.style.borderRadius = '50%';
  logo.style.width = '24px';
  logo.style.height = '24px';
  logo.style.display = 'flex';
  logo.style.justifyContent = 'center';
  logo.style.alignItems = 'center';
  logo.style.fontWeight = 'bold';
  
  // Add title
  const title = document.createElement('h3');
  title.className = 'truthguard-title';
  title.textContent = 'TruthGuard Alert';
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.className = 'truthguard-close';
  closeButton.textContent = '✕';
  closeButton.addEventListener('click', () => alertElement.remove());
  
  header.appendChild(logo);
  header.appendChild(title);
  alertElement.appendChild(header);
  alertElement.appendChild(closeButton);
  
  // Add content
  const content = document.createElement('div');
  content.className = 'truthguard-content';
  content.textContent = message;
  alertElement.appendChild(content);
  
  // Add reasons
  const reasonsList = document.createElement('ul');
  reasonsList.className = 'truthguard-reasons';
  
  reasons.forEach(reason => {
    const reasonItem = document.createElement('li');
    reasonItem.textContent = reason;
    reasonsList.appendChild(reasonItem);
  });
  
  alertElement.appendChild(reasonsList);
  
  // Add buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'truthguard-buttons';
  
  // Add "View Alternatives" button
  const viewAlternativesButton = document.createElement('button');
  viewAlternativesButton.className = 'truthguard-button truthguard-primary';
  viewAlternativesButton.textContent = 'View Verified Sources';
  viewAlternativesButton.addEventListener('click', () => {
    // Replace the alert content with alternatives
    alertElement.innerHTML = '';
    
    // Recreate header
    const altHeader = document.createElement('div');
    altHeader.className = 'truthguard-header';
    altHeader.appendChild(logo.cloneNode(true));
    
    const altTitle = document.createElement('h3');
    altTitle.className = 'truthguard-title';
    altTitle.textContent = 'Verified Sources';
    altHeader.appendChild(altTitle);
    
    const altCloseButton = closeButton.cloneNode(true);
    altCloseButton.addEventListener('click', () => alertElement.remove());
    
    alertElement.appendChild(altHeader);
    alertElement.appendChild(altCloseButton);
    
    // Add alternatives
    const altContent = document.createElement('div');
    altContent.className = 'truthguard-content';
    altContent.textContent = 'Here are some verified sources on this topic:';
    alertElement.appendChild(altContent);
    
    // Create links to alternatives
    const altList = document.createElement('ul');
    altList.style.listStyleType = 'none';
    altList.style.padding = '5px 0';
    
    alternatives.forEach(alt => {
      const altItem = document.createElement('li');
      altItem.style.margin = '8px 0';
      
      const altLink = document.createElement('a');
      altLink.href = alt.url;
      altLink.textContent = alt.title;
      altLink.style.color = '#3498db';
      altLink.style.textDecoration = 'none';
      altLink.style.fontWeight = '500';
      altLink.target = '_blank';
      
      altItem.appendChild(altLink);
      altList.appendChild(altItem);
    });
    
    alertElement.appendChild(altList);
    
    // Back button
    const backButton = document.createElement('button');
    backButton.className = 'truthguard-button truthguard-secondary';
    backButton.textContent = 'Back';
    backButton.style.width = '100%';
    backButton.style.marginTop = '10px';
    backButton.addEventListener('click', () => {
      alertElement.remove();
      showAlert(message, reasons, alternatives);
    });
    
    alertElement.appendChild(backButton);
  });
  
  // Add "Dismiss" button
  const dismissButton = document.createElement('button');
  dismissButton.className = 'truthguard-button truthguard-secondary';
  dismissButton.textContent = 'Dismiss';
  dismissButton.addEventListener('click', () => alertElement.remove());
  
  buttonsContainer.appendChild(viewAlternativesButton);
  buttonsContainer.appendChild(dismissButton);
  alertElement.appendChild(buttonsContainer);
  
  // Add to the page
  document.body.appendChild(alertElement);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "manualScan") {
    analyzePageContent();
  } else if (request.action === "updateAutoScan") {
    autoScan = request.autoScan;
  }
});

// Run on page load if auto-scan is enabled
if (autoScan) {
  // Wait for the page to fully load
  window.addEventListener('load', function() {
    // Give a slight delay to ensure content is loaded
    setTimeout(analyzePageContent, 1500);
  });
}
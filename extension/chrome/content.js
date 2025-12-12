// Content script that runs on punchit.atomicobject.com/newpunch.php
// Scrapes punch data from the page and sends it to the background script

// Debounce function to prevent spamming the light controller
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function scrapePunchData() {
  const data = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    pageTitle: document.title,
    issues: []
  };

  // Find all issue popovers
  // Pattern: div with class matching "issues-{date}-popover"
  const issuePopovers = document.querySelectorAll('div[class*="issues-"][class*="-popover"]');

  issuePopovers.forEach(popover => {
    // Extract date from class name
    // Class format: "issues-2025-12-09-popover popover"
    const classMatch = popover.className.match(/issues-(\d{4}-\d{2}-\d{2})-popover/);
    const date = classMatch ? classMatch[1] : 'unknown';

    // Find all issue items in the list
    const issueItems = popover.querySelectorAll('.issues-list li span');

    issueItems.forEach(item => {
      const issueText = item.textContent.trim();
      if (issueText) {
        data.issues.push({
          date: date,
          description: issueText
        });
      }
    });
  });

  return data;
}

// Send scraped data to background script
function sendData() {
  const data = scrapePunchData();
  console.log('Punch-Up Extension: Scraped data:', data);

  chrome.runtime.sendMessage({
    type: 'PUNCH_DATA_SCRAPED',
    data: data
  }).then(() => {
    console.log('Punch-Up Extension: Data sent to background script');
  }).catch(error => {
    console.error('Punch-Up Extension: Error sending data:', error);
  });
}

// Create debounced version for MutationObserver (1 second delay)
const debouncedSendData = debounce(sendData, 1000);

// Run immediately when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', sendData);
} else {
  sendData();
}

// Also scrape when page content changes (for dynamic updates)
// Use debounced version to prevent spam from frequent DOM changes
const observer = new MutationObserver(() => {
  debouncedSendData();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCRAPE_NOW') {
    sendData();
    sendResponse({ success: true });
    return true;
  }
});
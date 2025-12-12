// Popup script for settings UI

// Load saved settings
async function loadSettings() {
  const settings = await chrome.storage.local.get(['punchData', 'lastUpdate', 'lastVisitTime']);

  // Display punch issues
  if (settings.punchData) {
    displayScrapedData(settings.punchData);
  }

  // Check if it's been more than 24 hours since last visit
  if (settings.lastVisitTime) {
    const hoursSinceVisit = (Date.now() - settings.lastVisitTime) / (1000 * 60 * 60);
    if (hoursSinceVisit >= 24) {
      const lastUpdateEl = document.getElementById('lastUpdate');
      lastUpdateEl.textContent = '';
      const strong = document.createElement('strong');
      strong.style.color = '#ff9800';
      strong.textContent = '⚠️ Not visited in 24+ hours - please check PunchIt!';
      lastUpdateEl.appendChild(strong);
      return; // Don't show normal last update time
    }
  }

  if (settings.lastUpdate) {
    document.getElementById('lastUpdate').textContent =
      `Last updated: ${new Date(settings.lastUpdate).toLocaleString()}`;
  }
}

// Display punch issues
function displayScrapedData(data) {
  const container = document.getElementById('issuesContainer');
  const label = document.getElementById('issuesLabel');

  // Clear existing content
  container.textContent = '';

  if (!data || !data.issues) {
    const p = document.createElement('p');
    p.className = 'info';
    p.textContent = 'No data available';
    container.appendChild(p);
    return;
  }

  if (data.issues.length === 0) {
    const div = document.createElement('div');
    div.className = 'no-issues';
    div.textContent = 'No issues found - all punches are complete!';
    container.appendChild(div);
    label.textContent = 'Punch Status:';
    return;
  }

  // There are issues - show them
  label.textContent = `Punch Issues (${data.issues.length}):`;

  // Create has-issues summary
  const hasIssuesDiv = document.createElement('div');
  hasIssuesDiv.className = 'has-issues';
  hasIssuesDiv.textContent = `Found ${data.issues.length} issue${data.issues.length > 1 ? 's' : ''}`;
  container.appendChild(hasIssuesDiv);

  // Create issue items using safe DOM manipulation
  data.issues.forEach(issue => {
    const issueItem = document.createElement('div');
    issueItem.className = 'issue-item';

    const issueDate = document.createElement('div');
    issueDate.className = 'issue-date';
    issueDate.textContent = formatDate(issue.date);

    const issueDescription = document.createElement('div');
    issueDescription.className = 'issue-description';
    issueDescription.textContent = issue.description;

    issueItem.appendChild(issueDate);
    issueItem.appendChild(issueDescription);
    container.appendChild(issueItem);
  });
}

// Format date for display (e.g., "2025-12-09" -> "December 9, 2025")
function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

// Test light
async function testLight() {
  try {
    const result = await chrome.runtime.sendMessage({ type: 'TEST_LIGHT', hasIssues: true });
    if (result.success) {
      alert('Light test sent! Check your light.');
    } else {
      alert('Light test failed: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Failed to communicate with light: ' + error.message);
  }
}

// Turn light off
async function lightOff() {
  try {
    const result = await chrome.runtime.sendMessage({ type: 'LIGHT_OFF' });
    if (result.success) {
      alert('Light turned off');
    } else {
      alert('Failed to turn off light: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Failed to communicate with light: ' + error.message);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('testLightIssues').addEventListener('click', testLight);
document.getElementById('lightOff').addEventListener('click', lightOff);

// Listen for storage changes to update display
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.punchData) {
      displayScrapedData(changes.punchData.newValue);
    }
    if (changes.lastUpdate || changes.lastVisitTime) {
      // Reload settings to update last visit warning if needed
      loadSettings();
    }
  }
});
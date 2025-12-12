// Popup script for settings UI

// Load saved settings
async function loadSettings() {
  const settings = await browser.storage.local.get(['alertTime', 'enabled', 'punchData', 'lastUpdate']);

  // Populate form fields
  if (settings.alertTime) {
    document.getElementById('alertTime').value = settings.alertTime;
  }

  if (settings.enabled !== undefined) {
    document.getElementById('enabled').checked = settings.enabled;
  }

  // Display punch issues
  if (settings.punchData) {
    displayScrapedData(settings.punchData);
  }

  if (settings.lastUpdate) {
    document.getElementById('lastUpdate').textContent =
      `Last updated: ${new Date(settings.lastUpdate).toLocaleString()}`;
  }

  // Get alarm info
  const alarmInfo = await browser.runtime.sendMessage({ type: 'GET_ALARM_INFO' });
  if (alarmInfo) {
    document.getElementById('nextAlarm').textContent =
      `Next alert: ${alarmInfo.formattedTime}`;
  }
}

// Display punch issues
function displayScrapedData(data) {
  const container = document.getElementById('issuesContainer');
  const label = document.getElementById('issuesLabel');

  if (!data || !data.issues) {
    container.innerHTML = '<p class="info">No data available</p>';
    return;
  }

  if (data.issues.length === 0) {
    container.innerHTML = '<div class="no-issues">No issues found - all punches are complete!</div>';
    label.textContent = 'Punch Status:';
    return;
  }

  // There are issues - show them
  label.textContent = `Punch Issues (${data.issues.length}):`;

  let html = `<div class="has-issues">Found ${data.issues.length} issue${data.issues.length > 1 ? 's' : ''}</div>`;

  data.issues.forEach(issue => {
    html += `
      <div class="issue-item">
        <div class="issue-date">${formatDate(issue.date)}</div>
        <div class="issue-description">${issue.description}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Format date for display (e.g., "2025-12-09" -> "December 9, 2025")
function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

// Save settings
async function saveSettings() {
  const alertTime = document.getElementById('alertTime').value;
  const enabled = document.getElementById('enabled').checked;

  await browser.storage.local.set({
    alertTime: alertTime,
    enabled: enabled
  });

  // Notify background script to update alarm
  await browser.runtime.sendMessage({ type: 'UPDATE_SETTINGS' });

  // Show success message
  const successMsg = document.getElementById('saveSuccess');
  successMsg.style.display = 'block';
  setTimeout(() => {
    successMsg.style.display = 'none';
  }, 3000);

  // Reload to show updated alarm info
  loadSettings();
}

// Test notification
async function testNotification() {
  await browser.runtime.sendMessage({ type: 'TEST_NOTIFICATION' });
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save').addEventListener('click', saveSettings);
document.getElementById('testNotification').addEventListener('click', testNotification);

// Listen for storage changes to update display
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.punchData) {
      displayScrapedData(changes.punchData.newValue);
    }
    if (changes.lastUpdate) {
      document.getElementById('lastUpdate').textContent =
        `Last updated: ${new Date(changes.lastUpdate.newValue).toLocaleString()}`;
    }
  }
});
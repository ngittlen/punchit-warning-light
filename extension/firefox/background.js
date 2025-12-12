// Background script for Punch-Up Light extension
// Handles data storage and light control

// Update icon based on punch data
async function updateIcon(data) {
  if (!data || !data.issues) {
    // No data yet - use default icon
    await browser.action.setIcon({
      path: {
        48: 'icon-48.png',
        96: 'icon-96.png'
      }
    });
    return;
  }

  if (data.issues.length === 0) {
    // No issues - use green icon
    await browser.action.setIcon({
      path: {
        48: 'icon-good-48.png',
        96: 'icon-good-96.png'
      }
    });
    await browser.action.setBadgeText({ text: '' });
  } else {
    // Has issues - use red icon with badge showing count
    await browser.action.setIcon({
      path: {
        48: 'icon-issues-48.png',
        96: 'icon-issues-96.png'
      }
    });
    await browser.action.setBadgeText({ text: data.issues.length.toString() });
    await browser.action.setBadgeBackgroundColor({ color: '#dc3545' });
  }
}

// Check if last visit was more than 24 hours ago and update icon accordingly
async function checkLastVisit() {
  const { lastVisitTime, punchData } = await browser.storage.local.get(['lastVisitTime', 'punchData']);

  if (!lastVisitTime) {
    // No visit recorded yet - show default icon or data-based icon if available
    if (punchData) {
      await updateIcon(punchData);
    }
    return;
  }

  const hoursSinceVisit = (Date.now() - lastVisitTime) / (1000 * 60 * 60);

  if (hoursSinceVisit >= 24) {
    // Show issues icon to remind user to check
    await browser.action.setIcon({
      path: {
        48: 'icon-issues-48.png',
        96: 'icon-issues-96.png'
      }
    });
    await browser.action.setBadgeText({ text: '!' });
    await browser.action.setBadgeBackgroundColor({ color: '#ff9800' }); // Orange for "needs checking"
    console.log('PunchIt page not visited in 24 hours - showing reminder icon');
  } else if (punchData) {
    // Less than 24 hours - show normal icon based on data
    await updateIcon(punchData);
  }
}

// Store scraped data when received from content script
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'PUNCH_DATA_SCRAPED') {
    browser.storage.local.set({
      punchData: message.data,
      lastUpdate: new Date().toISOString(),
      lastVisitTime: Date.now()  // Track when user last visited PunchIt page
    });

    // Update icon based on issues
    updateIcon(message.data);

    // Update physical light
    const hasIssues = message.data.issues && message.data.issues.length > 0;
    lightController.updateLight(hasIssues).catch(err => {
      console.error('Failed to update light:', err);
    });

    return Promise.resolve({ success: true });
  }

  if (message.type === 'TEST_LIGHT') {
    // Test the light with a specific color or update
    const hasIssues = message.hasIssues !== undefined ? message.hasIssues : true;
    return lightController.updateLight(hasIssues)
      .then(() => ({ success: true }))
      .catch(err => ({ success: false, error: err.message }));
  }

  if (message.type === 'LIGHT_SET_COLOR') {
    const { hue, saturation, value } = message;
    return lightController.setColor(hue, saturation, value)
      .then(() => ({ success: true }))
      .catch(err => ({ success: false, error: err.message }));
  }

  if (message.type === 'LIGHT_OFF') {
    return lightController.turnOff()
      .then(() => ({ success: true }))
      .catch(err => ({ success: false, error: err.message }));
  }
});

// Set up periodic alarm to check if page hasn't been visited in 24 hours
browser.alarms.create('checkLastVisit', { periodInMinutes: 60 });

// Listen for alarm to check last visit time
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkLastVisit') {
    checkLastVisit();
  }
});

// Check last visit on startup and update icon accordingly
checkLastVisit();
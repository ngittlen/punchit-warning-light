// Background script for Punch-Up Alert extension
// Handles alarms, notifications, and data storage

const ALARM_NAME = 'punchReminder';
const DEFAULT_ALERT_TIME = '17:00'; // 5:00 PM

// Initialize extension on install
browser.runtime.onInstalled.addListener(async () => {
  console.log('Punch-Up Extension installed');

  // Set default settings if not already set
  const settings = await browser.storage.local.get(['alertTime', 'enabled']);

  if (!settings.alertTime) {
    await browser.storage.local.set({ alertTime: DEFAULT_ALERT_TIME });
  }

  if (settings.enabled === undefined) {
    await browser.storage.local.set({ enabled: true });
  }

  // Set up the alarm
  setupAlarm();
});

// Set up alarm based on configured time
async function setupAlarm() {
  const settings = await browser.storage.local.get(['alertTime', 'enabled']);

  if (!settings.enabled) {
    console.log('Alerts disabled, not setting up alarm');
    return;
  }

  const alertTime = settings.alertTime || DEFAULT_ALERT_TIME;
  const nextAlarmTime = getNextAlarmTime(alertTime);

  // Clear existing alarm
  await browser.alarms.clear(ALARM_NAME);

  // Create new alarm
  await browser.alarms.create(ALARM_NAME, {
    when: nextAlarmTime,
    periodInMinutes: 1440 // Repeat daily (24 hours)
  });

  console.log(`Alarm set for ${new Date(nextAlarmTime).toLocaleString()}`);
}

// Calculate next alarm time based on HH:MM format
function getNextAlarmTime(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const now = new Date();
  const target = new Date();

  target.setHours(hours, minutes, 0, 0);

  // If target time has passed today, schedule for tomorrow
  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime();
}

// Listen for alarm trigger
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('Punch reminder alarm triggered');
    await showNotification();
  }
});

// Show notification with punch data
async function showNotification() {
  const result = await browser.storage.local.get('punchData');
  const data = result.punchData || {};

  let title = 'Punch-Up Reminder';
  let message = 'Time to check your punch status!';

  if (data.issues) {
    if (data.issues.length === 0) {
      title = 'Punch Status: All Good!';
      message = 'No punch issues found. Great work!';
    } else {
      title = `Punch Issues Found (${data.issues.length})`;
      message = data.issues.map(issue => `${issue.date}: ${issue.description}`).join('\n');
    }
  } else if (data.timestamp) {
    message += `\nLast updated: ${new Date(data.timestamp).toLocaleString()}`;
  }

  await browser.notifications.create({
    type: 'basic',
    title: title,
    message: message
  });

  console.log('Notification shown:', message);
}

// Store scraped data when received from content script
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'PUNCH_DATA_SCRAPED') {
    console.log('Received punch data from content script:', message.data);

    browser.storage.local.set({
      punchData: message.data,
      lastUpdate: new Date().toISOString()
    });

    return Promise.resolve({ success: true });
  }

  if (message.type === 'TEST_NOTIFICATION') {
    showNotification();
    return Promise.resolve({ success: true });
  }

  if (message.type === 'UPDATE_SETTINGS') {
    setupAlarm();
    return Promise.resolve({ success: true });
  }

  if (message.type === 'GET_ALARM_INFO') {
    return browser.alarms.get(ALARM_NAME).then(alarm => {
      if (alarm) {
        return {
          scheduledTime: alarm.scheduledTime,
          formattedTime: new Date(alarm.scheduledTime).toLocaleString()
        };
      }
      return null;
    });
  }
});

// Set up alarm when extension starts
setupAlarm();
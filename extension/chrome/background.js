// Light Controller - Communicates with native Python script to control Kasa light
const NATIVE_APP_NAME = 'com.punchup.light';

class LightController {
  constructor() {
    this.port = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  connect() {
    if (this.port) {
      return; // Already connected or connecting
    }

    try {
      console.log('Connecting to light controller...');
      this.port = chrome.runtime.connectNative(NATIVE_APP_NAME);

      this.port.onMessage.addListener((response) => {
        console.log('Light controller response:', response);
        if (response.status === 'ok') {
          this.connected = true;
          this.reconnectAttempts = 0;
        } else if (response.status === 'error') {
          console.error('Light controller error:', response.message);
        }
      });

      this.port.onDisconnect.addListener(() => {
        console.log('Light controller disconnected');
        this.connected = false;
        this.port = null;

        const error = chrome.runtime.lastError;
        if (error) {
          console.error('Disconnect error:', error.message);
        }

        // Try to reconnect if not too many attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          setTimeout(() => this.connect(), 1000);
        }
      });

      this.connected = true;
      console.log('Light controller connected');

    } catch (error) {
      console.error('Failed to connect to light controller:', error);
      this.port = null;
      this.connected = false;
    }
  }

  sendMessage(message) {
    if (!this.port) {
      this.connect();
    }

    if (!this.port) {
      console.error('Cannot send message: not connected to light controller');
      return Promise.reject(new Error('Not connected to light controller'));
    }

    try {
      this.port.postMessage(message);
      return Promise.resolve();
    } catch (error) {
      console.error('Error sending message to light controller:', error);
      this.connected = false;
      this.port = null;
      return Promise.reject(error);
    }
  }

  async updateLight(hasIssues) {
    console.log(`Updating light: hasIssues=${hasIssues}`);
    return this.sendMessage({
      action: 'update_light',
      hasIssues: hasIssues
    });
  }

  async setColor(hue, saturation, value) {
    console.log(`Setting light color: HSV(${hue}, ${saturation}, ${value})`);
    return this.sendMessage({
      action: 'set_color',
      hue: hue,
      saturation: saturation,
      value: value
    });
  }

  async turnOff() {
    console.log('Turning light off');
    return this.sendMessage({
      action: 'turn_off'
    });
  }

  async discover() {
    console.log('Discovering light');
    return this.sendMessage({
      action: 'discover'
    });
  }

  disconnect() {
    if (this.port) {
      this.port.disconnect();
      this.port = null;
      this.connected = false;
    }
  }
}

// Create singleton instance
const lightController = new LightController();

// Background script for Punch-Up Light extension
// Handles data storage and light control

// Update icon based on punch data
async function updateIcon(data) {
  if (!data || !data.issues) {
    // No data yet - use default icon
    await chrome.action.setIcon({
      path: {
        48: 'icon-48.png',
        96: 'icon-96.png'
      }
    });
    return;
  }

  if (data.issues.length === 0) {
    // No issues - use green icon
    await chrome.action.setIcon({
      path: {
        48: 'icon-good-48.png',
        96: 'icon-good-96.png'
      }
    });
    await chrome.action.setBadgeText({ text: '' });
  } else {
    // Has issues - use red icon with badge showing count
    await chrome.action.setIcon({
      path: {
        48: 'icon-issues-48.png',
        96: 'icon-issues-96.png'
      }
    });
    await chrome.action.setBadgeText({ text: data.issues.length.toString() });
    await chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
  }
}

// Check if last visit was more than 24 hours ago and update icon accordingly
async function checkLastVisit() {
  const { lastVisitTime, punchData } = await chrome.storage.local.get(['lastVisitTime', 'punchData']);

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
    await chrome.action.setIcon({
      path: {
        48: 'icon-issues-48.png',
        96: 'icon-issues-96.png'
      }
    });
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#ff9800' }); // Orange for "needs checking"
    console.log('PunchIt page not visited in 24 hours - showing reminder icon');
  } else if (punchData) {
    // Less than 24 hours - show normal icon based on data
    await updateIcon(punchData);
  }
}

// Store scraped data when received from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PUNCH_DATA_SCRAPED') {
    console.log('Received punch data from content script:', message.data);

    chrome.storage.local.set({
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

    sendResponse({ success: true });
    return true; // Keep channel open for async response
  }

  if (message.type === 'TEST_LIGHT') {
    // Test the light with a specific color or update
    const hasIssues = message.hasIssues !== undefined ? message.hasIssues : true;
    lightController.updateLight(hasIssues)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'LIGHT_SET_COLOR') {
    const { hue, saturation, value } = message;
    lightController.setColor(hue, saturation, value)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'LIGHT_OFF') {
    lightController.turnOff()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }
});

// Set up periodic alarm to check if page hasn't been visited in 24 hours
chrome.alarms.create('checkLastVisit', { periodInMinutes: 60 });

// Listen for alarm to check last visit time
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkLastVisit') {
    checkLastVisit();
  }
});

// Check last visit on startup and update icon accordingly
checkLastVisit();
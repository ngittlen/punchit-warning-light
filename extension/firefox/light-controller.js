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
      this.port = browser.runtime.connectNative(NATIVE_APP_NAME);

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

        const error = browser.runtime.lastError;
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

// Create singleton instance (use var for global scope in background scripts)
var lightController = new LightController();
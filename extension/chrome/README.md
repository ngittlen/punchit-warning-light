# Punch-Up Light - Chrome Extension

A Chrome extension that scrapes punch data from punchit.atomicobject.com, displays issues in a popup, and controls a Kasa smart light for visual alerts.

## Features

- Automatically scrapes punch data when visiting punchit.atomicobject.com/newpunch.php
- Displays punch issues in an easy-to-read popup
- Warns you if you haven't checked PunchIt in 24+ hours (orange "!" badge)
- Updates extension icon based on punch status (default/green/red)
- Controls a Kasa smart light with time-based color warnings via native messaging
- Test controls for manual light testing (collapsible menu)
- Stores scraped data locally for offline access

## Installation

### 1. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** by toggling the switch in the top-right corner
3. Click the **Load unpacked** button
4. Navigate to and select the `extension/chrome` directory
5. The extension should now appear in your extensions list

### 2. Pin the Extension (Optional)

1. Click the puzzle piece icon in the Chrome toolbar (Extensions menu)
2. Find "Punch-Up Light" in the list
3. Click the pin icon to keep it visible in your toolbar

### 3. Set Up Native Messaging

To control the Kasa smart light, set up native messaging with the Python controller (see `../../python/SETUP.md`)

## Usage

### Checking Punch Status

1. Visit `https://punchit.atomicobject.com/newpunch.php`
2. The extension will automatically scrape the page for punch issues
3. Click the extension icon to view any detected issues
4. The extension icon will change:
   - Default icon: No data yet
   - Green icon: No issues found
   - Red icon with number badge: Issues found (badge shows count)
   - Red icon with orange "!" badge: Haven't visited in 24+ hours

### Testing the Light

1. Click the extension icon to open the popup
2. Click "Test Light" to expand test controls
3. Use the test buttons:
   - "Test Light (Issues Mode)" - Sets light to current warning color
   - "Turn Light Off" - Turns off the physical light

### 24-Hour Visit Reminder

If you haven't visited the PunchIt page in 24+ hours:
- Extension icon changes to red with orange "!" badge
- Popup shows warning: "⚠️ Not visited in 24+ hours - please check PunchIt!"
- Resets automatically when you visit the page again

## Files

- `manifest.json` - Extension configuration
- `background.js` - Service worker handling alarms, storage, and light control
- `content.js` - Content script that scrapes punch data from the website
- `popup.html` - Extension popup UI with collapsible test controls
- `popup.js` - Popup logic and display
- `icon-*.png` - Extension icons (default, good status, issues status)

## Differences from Firefox Version

This Chrome version is functionally identical to the Firefox version but uses:
- Chrome extension APIs (`chrome.*` instead of `browser.*`)
- Service worker instead of background scripts
- Chrome-specific manifest format

## Troubleshooting

### Extension not loading
- Make sure you selected the correct directory (`extension/chrome`)
- Check the Chrome console for any errors: `chrome://extensions/` → Details → Errors

### Punch data not being scraped
- Make sure you're on the correct URL: `https://punchit.atomicobject.com/newpunch.php`
- Check the browser console on that page for any error messages
- Click the extension icon to see if "Last updated" shows a recent time

### 24-Hour Warning Not Appearing
- Chrome must be running for alarms to trigger
- Check that alarms permission is in manifest.json
- Look for alarm-related console messages

### Native messaging not working
- Verify the Python script is installed and the manifest is in the correct location
- For Chrome, the native messaging manifest should be in:
  - macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
  - Linux: `~/.config/google-chrome/NativeMessagingHosts/`
  - Windows: `HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\`
- Check the background service worker console for error messages

## Permissions

The extension requires the following permissions:
- `alarms` - To check for 24-hour staleness periodically
- `storage` - To save punch data and last visit time
- `nativeMessaging` - To communicate with the Kasa light controller
- `https://punchit.atomicobject.com/*` - To scrape punch data

## Privacy

All data is stored locally in your browser. No data is sent to external servers except:
- Requests to punchit.atomicobject.com (the website being scraped)
- Local native messaging communication with the Python light controller (if configured)
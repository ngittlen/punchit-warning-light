# Punch-Up Alert Firefox Extension

A Firefox extension that scrapes punch data from `https://punchit.atomicobject.com/newpunch.php` and displays macOS notifications at scheduled times.

## Features

- Automatically scrapes punch data when you visit the punch page
- Schedules daily alerts at a configurable time
- Shows macOS native notifications with punch status
- Stores scraped data for offline access
- Simple settings UI for customization

## Installation

### Method 1: Temporary Installation (Development/Testing)

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Navigate to this directory and select `manifest.json`
5. The extension will be loaded and active until you restart Firefox

### Method 2: Permanent Installation (Unsigned)

Firefox requires extensions to be signed by Mozilla for permanent installation. For development:

1. Open Firefox and navigate to `about:config`
2. Search for `xpinstall.signatures.required`
3. Set it to `false` (note: this disables signature verification)
4. Package the extension: `zip -r punch-up-alert.zip *`
5. Navigate to `about:addons`
6. Click the gear icon and select "Install Add-on From File"
7. Select the zip file you created

## Usage

### Initial Setup

1. Install the extension using one of the methods above
2. Click the extension icon in the toolbar to open settings
3. Set your desired alert time (default is 5:00 PM)
4. Ensure "Enable Alerts" is checked
5. Click "Save Settings"

### Scraping Data

The extension automatically scrapes data when you visit:
`https://punchit.atomicobject.com/newpunch.php`

The scraped data is immediately stored and will be displayed in your next notification.

### Viewing Scraped Data

1. Click the extension icon to open the popup
2. The "Scraped Data" section shows the most recent data collected
3. The timestamp shows when data was last updated

### Testing Notifications

1. Open the extension popup
2. Click "Test Notification" to see a sample alert
3. This will show a notification with your currently stored punch data

## Settings

- **Alert Time**: Set the daily time when you want to receive reminders (24-hour format)
- **Enable Alerts**: Toggle notifications on/off
- **Next Alert**: Shows when the next notification is scheduled

## How It Works

### Architecture

1. **Content Script** (`content.js`):
   - Runs on the punch webpage
   - Scrapes data from the page DOM
   - Sends data to background script via message passing

2. **Background Script** (`background.js`):
   - Manages alarm scheduling
   - Stores scraped data
   - Triggers notifications at scheduled times
   - Handles communication between popup and content scripts

3. **Popup UI** (`popup.html`, `popup.js`):
   - Provides settings interface
   - Displays scraped data
   - Allows testing notifications

### Data Flow

```
Webpage → Content Script → Background Script → Storage
                ↓
         Background Script → Alarm → Notification
```

## Customizing Scraping Logic

The content script in `content.js` uses generic selectors to find punch data. To customize for your specific page:

1. Open the punch webpage
2. Right-click and select "Inspect Element"
3. Identify the CSS selectors for the data you want to scrape
4. Edit `content.js` and update the selectors in the `scrapePunchData()` function

Example:
```javascript
// If your punch status is in an element with class "my-status"
data.status = document.querySelector('.my-status')?.textContent.trim();
```

## Troubleshooting

### Extension Not Loading
- Ensure you selected `manifest.json` when loading the add-on
- Check the Browser Console (Ctrl+Shift+J) for errors

### No Data Being Scraped
- Visit the punch webpage to trigger scraping
- Open the extension popup to verify data was captured
- Check the selectors in `content.js` match the actual page structure

### Notifications Not Appearing
- Ensure Firefox has notification permissions in macOS System Preferences
- Check that alerts are enabled in the extension popup
- Verify the alarm is set correctly (shows "Next alert" time)

### Alarm Not Triggering
- Firefox must be running for alarms to trigger
- Check that the scheduled time hasn't already passed today

## Development

### File Structure
```
extension/firefox/
├── manifest.json       # Extension configuration
├── background.js       # Background script (alarms, storage)
├── content.js          # Content script (scraping)
├── popup.html          # Settings UI
├── popup.js            # Settings logic
└── README.md          # This file
```

### Debugging

1. **Background Script**: `about:debugging` → This Firefox → Inspect (next to extension)
2. **Content Script**: Open webpage → Right-click → Inspect Element → Console
3. **Popup**: Right-click extension icon → Inspect Popup

All scripts log to console with prefix "Punch-Up Extension:"

## Permissions

The extension requires:
- `alarms`: Schedule daily notifications
- `notifications`: Display macOS alerts
- `storage`: Save settings and scraped data
- `https://punchit.atomicobject.com/*`: Access punch webpage

## Notes

- The extension uses Manifest V3 for better performance and security
- Alarms persist across browser restarts
- Data is stored locally using browser.storage.local
- The mutation observer in content.js detects dynamic page updates

## Future Enhancements

Potential improvements:
- Multiple alarm times per day
- Custom notification messages
- Data export functionality
- Integration with calendar apps
- Historical data tracking

todo:
use native messaging to communicate with python script
read hours from each day to see total time
figure out way to find gaps in days
make light more and more red from weekly hours until sunday midnight
if light is red monday morning keep light red until prior week is clean


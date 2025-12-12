# Punch-Up Light Firefox Extension

A Firefox extension that scrapes punch data from `https://punchit.atomicobject.com/newpunch.php`, displays issues in a popup, and controls a Kasa smart light via native messaging.

## Features

- Automatically scrapes punch data when you visit the punch page
- Displays punch issues in an easy-to-read popup
- Updates browser icon based on punch status (default/green/red)
- Warns you if you haven't checked PunchIt in 24+ hours (orange "!" badge)
- Controls Kasa smart light with time-based color warnings
- Test controls for manual light testing
- Stores scraped data locally for offline access

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
4. Package the extension: `zip -r punch-up-light.zip *`
5. Navigate to `about:addons`
6. Click the gear icon and select "Install Add-on From File"
7. Select the zip file you created

## Usage

### Initial Setup

1. Install the extension using one of the methods above
2. Set up native messaging (see `../../python/SETUP.md`)
3. Visit punchit.atomicobject.com/newpunch.php to scrape data

### Scraping Data

The extension automatically scrapes data when you visit:
`https://punchit.atomicobject.com/newpunch.php`

The scraped data is immediately:
- Stored locally in browser storage
- Displayed in the extension popup
- Sent to the light controller to update the physical light

### Viewing Scraped Data

1. Click the extension icon to open the popup
2. The "Punch Issues" section shows detected issues
3. Each issue displays the date and description
4. The timestamp shows when data was last updated

### Testing the Light

1. Open the extension popup
2. Click "Test Light" to expand test controls
3. Use the test buttons:
   - "Test Light (Issues Mode)" - Sets light to current warning color
   - "Turn Light Off" - Turns off the physical light

### 24-Hour Visit Reminder

If you haven't visited the PunchIt page in 24+ hours:
- Extension icon changes to red with orange "!" badge
- Popup shows warning: "⚠️ Not visited in 24+ hours - please check PunchIt!"
- Resets automatically when you visit the page again

## How It Works

### Architecture

1. **Content Script** (`content.js`):
   - Runs on the punch webpage
   - Scrapes issue data from the page DOM
   - Sends data to background script via message passing
   - Uses MutationObserver to detect dynamic page updates

2. **Background Script** (`background.js`):
   - Manages periodic alarms (checks for 24-hour staleness)
   - Stores scraped data and last visit time
   - Updates extension icon based on data and staleness
   - Handles communication with light controller via native messaging
   - Communicates between popup and content scripts

3. **Light Controller** (`light-controller.js`):
   - Provides native messaging interface
   - Sends commands to Python script
   - Handles light control operations

4. **Popup UI** (`popup.html`, `popup.js`):
   - Displays punch issues in readable format
   - Shows collapsible test controls
   - Displays last update time or staleness warning
   - Provides manual light control buttons

### Data Flow

```
Webpage → Content Script → Background Script → Storage
                                     ↓
                              Light Controller → Python → Kasa Light
                                     ↓
                              Icon Update (based on issues + staleness)
                                     ↓
                              Popup Display
```

### Icon States

- **Default**: No data yet (default icon)
- **Green**: No issues found (icon-good-*.png)
- **Red + number badge**: Issues detected (icon-issues-*.png + count)
- **Red + orange "!" badge**: Haven't visited in 24+ hours (icon-issues-*.png + orange "!")

## Customizing Scraping Logic

The content script in `content.js` scrapes punch issues from the page. The current implementation:

1. Finds all issue popovers: `div[class*="issues-"][class*="-popover"]`
2. Extracts dates from class names: `issues-2025-12-09-popover`
3. Finds issue descriptions: `.issues-list li span`
4. Builds an array of `{date, description}` objects

To customize for a different page structure:
1. Open the punch webpage
2. Right-click and select "Inspect Element"
3. Identify the CSS selectors for your data
4. Edit `content.js` and update the selectors in `scrapePunchData()`

## Troubleshooting

### Extension Not Loading
- Ensure you selected `manifest.json` when loading the add-on
- Check the Browser Console (Ctrl+Shift+J) for errors
- Verify all icon files are present (6 PNG files)

### No Data Being Scraped
- Visit the punch webpage to trigger scraping
- Open the extension popup to verify data was captured
- Check the selectors in `content.js` match the actual page structure
- Look for console messages with "Punch-Up Extension:" prefix

### Light Not Responding
- Verify native messaging is set up correctly (see `../../python/SETUP.md`)
- Check browser console for native messaging errors
- Ensure Python script is executable and in correct location
- Test Python script manually: `pipenv run python punch-light-controller.py discover`

### 24-Hour Warning Not Appearing
- Firefox must be running for alarms to trigger
- Check that alarms permission is in manifest.json
- Look for alarm-related console messages

## Development

### File Structure
```
extension/firefox/
├── manifest.json       # Extension configuration (MV3)
├── background.js       # Background script (storage, alarms, icon updates)
├── content.js          # Content script (scraping)
├── light-controller.js # Native messaging interface
├── popup.html          # Popup UI with collapsible test controls
├── popup.js            # Popup logic
└── README.md          # This file
```

### Debugging

1. **Background Script**: `about:debugging` → This Firefox → Inspect (next to extension)
2. **Content Script**: Open webpage → Right-click → Inspect Element → Console
3. **Popup**: Right-click extension icon → Inspect Popup

All scripts log to console with prefix "Punch-Up Extension:" or similar.

## Permissions

The extension requires:
- `alarms`: Check for 24-hour staleness periodically
- `storage`: Save settings, punch data, and last visit time
- `nativeMessaging`: Communicate with Python light controller
- `https://punchit.atomicobject.com/*`: Access and scrape punch webpage

## Notes

- The extension uses Manifest V3 for better performance and security
- Alarms persist across browser restarts
- Data is stored locally using browser.storage.local
- The MutationObserver in content.js detects dynamic page updates
- Icon and badge update automatically based on data and time
- Collapsible test controls use native HTML `<details>` element

## Future Enhancements

Potential improvements:
- Configurable staleness threshold (currently 24 hours)
- Historical data tracking
- Export functionality for punch data
- Custom light color schemes
- Multiple light support

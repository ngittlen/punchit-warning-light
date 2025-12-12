# Punch-Up Light

A Firefox/Chrome extension + Python system that controls a Kasa smart light to warn you about PunchIt punch issues with an escalating color system.
[[punchit-light.gif]]

## Overview

This project has two main components:

1. **Browser Extension** (Firefox/Chrome) - Scrapes punch data from punchit.atomicobject.com and detects issues
2. **Python Controller** - Controls a Kasa smart light with time-based color warnings

## Setup

### 1. Python Setup

Install dependencies:

```bash
cd python
pipenv install
```

Connect the light to your wifi network:

```bash
pipenv run python punch-light-controller.py setup
```

Test the light:

```bash
pipenv run python punch-light-controller.py set 60 100 100  # Yellow
```

See [python/SETUP.md](python/SETUP.md) for detailed Python setup instructions.

### 2. Browser Extension Setup

Choose either Firefox or Chrome (or both):

#### Firefox Extension

**Native Messaging Setup:**

Edit `python/com.punchup.light.json` and set your actual path:

```json
{
  "path": "/PATH-TO-THIS-DIRECTORY/punch-up-light/python/punch-light-wrapper.sh"
}
```

Install the native messaging manifest:

```bash
# Create directory
mkdir -p ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/

# Copy manifest
cp python/com.punchup.light.json ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/
```

**Load Extension:**

1. Open Firefox
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select any file in `extension/firefox/` (e.g., `manifest.json`)

#### Chrome Extension (WIP)

**Native Messaging Setup:**

Edit `python/com.punchup.light.json` and set your actual path:

```json
{
  "path": "/PATH-TO-THIS-DIRECTORY/punch-up-light/python/punch-light-wrapper.sh"
}
```

Install the native messaging manifest:

```bash
# Create directory
mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/

# Copy manifest
cp python/com.punchup.light.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
```

**Load Extension:**

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `extension/chrome/` directory

## How It Works

### Browser Extension Features

- **Issue Detection**: Automatically scrapes punch data when you visit PunchIt
- **Visual Feedback**: Browser icon changes color based on punch status
  - Default: No data yet
  - Green: All punches complete
  - Red + number badge: Issues detected (badge shows count)
  - Red + orange "!" badge: Haven't visited PunchIt in 24+ hours
- **Popup Display**: Shows detailed list of punch issues by date
- **Light Control**: Automatically updates your Kasa light based on issues
- **Visit Reminders**: Warns you if you haven't checked PunchIt in 24 hours

### Light Warning System

The Kasa light provides escalating visual warnings when there are punch issues:

#### When Issues Exist

- **Monday 5pm - Friday 9am**: Gradient from yellow to red
  - Starts at yellow: HSV(60, 100%, 100%)
  - Gradually shifts to red over the week
  - Reaches deep red: HSV(0, 100%, 100%) by Friday 9am
- **All other times**: Bright red HSV(0, 100%, 100%)
  - Friday 9am - Monday 5pm (weekend warning)

#### When No Issues

- **Light turns soft green**: HSV(105, 60%, 40%)
- Stays green until issues are detected again

#### Automatic Updates

The light updates automatically when:
- You visit the PunchIt page (instant update)
- Every 12 hours in the background (to keep time-based colors current)

## Usage

### Testing the Light

Use the extension popup to test:

1. Click the extension icon
2. Click "Test Light" to expand the test controls
3. Use the buttons:
   - "Test Light (Issues Mode)" - Simulate having issues
   - "Turn Light Off" - Turn off the light

Or test via command line:

```bash
cd python

# Test with issues (will set color based on current time)
pipenv run python punch-light-controller.py update true

# Test no issues (will set soft green)
pipenv run python punch-light-controller.py update false

# Set specific color
pipenv run python punch-light-controller.py set 180 100 100  # Cyan
```

## Troubleshooting

### Light not responding

1. Check light is on and connected to WiFi
2. Verify you're on the same network
3. Run discovery: `pipenv run python punch-light-controller.py discover`
4. Check browser console for errors

### Native messaging not working

1. Verify manifest path is correct and absolute
2. Check manifest is in the correct location:
   - Firefox: `~/Library/Application Support/Mozilla/NativeMessagingHosts/`
   - Chrome: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
3. Ensure wrapper script is executable: `ls -l python/punch-light-wrapper.sh`
4. Check browser console for native messaging errors:
   - Firefox: Browser Console (Ctrl+Shift+J / Cmd+Shift+J)
   - Chrome: Extension background page console (chrome://extensions → Details → Inspect views: background page)

## Technical Details

### Communication Flow

1. **Content Script** → Scrapes HTML from PunchIt page
2. **Background Script** → Receives scraped data, updates storage
3. **Light Controller** → Sends message via native messaging
4. **Python Script** → Receives message, calculates color, updates light

### Native Messaging Protocol

Messages are JSON over stdin/stdout:

Request from browser extension:
```json
{
  "action": "update_light",
  "hasIssues": true
}
```

Response from Python:
```json
{
  "status": "ok",
  "action": "on",
  "color": {"hue": 45, "saturation": 100, "value": 100}
}
```

# Punch-Up Light Controller Setup

This Python script controls a Kasa smart light to warn you about PunchIt issues with color-coded alerts.

## Prerequisites

1. **Python 3.13** (or compatible version)
2. **pipenv** - Install with: `pip install pipenv`
3. **Kasa Smart Light** - A TP-Link Kasa light that supports HSV colors

## Installation

### 1. Install Python Dependencies

```bash
cd python
pipenv install
```

This will install:
- `python-kasa` - Library for controlling Kasa devices
- Other required dependencies

### 2. Set Up And Discover Your Light

#### If Your Light is Already on WiFi

If your light is already connected to your network:

```bash
pipenv run python punch-light-controller.py discover
```

This should output something like:
```
Cached light IP: 192.168.1.100
Successfully connected using cached IP
Connected to light: Desk Lamp at 192.168.1.100
Found light at 192.168.1.100
Alias: Desk Lamp
```

The IP address is automatically cached in `punch-light-cache.json` for faster connections.

#### If Your Light is New or Reset

If you need to connect a new light to your WiFi network:

```bash
pipenv run python punch-light-controller.py setup
```

This will guide you through:
1. Resetting the light (turn on/off 3 times quickly)
2. Connecting your computer to the light's WiFi network (TP-Link_Smart Bulb_####)
3. Providing your WiFi network credentials
4. Connecting the light to your network
5. Automatically discovering and caching the light's IP address

### 3. Test the Light Control

Try setting the light to yellow (testing the warning color):

```bash
pipenv run python punch-light-controller.py set 60 100 100
```

The light should turn on and display a yellow color.

Try updating based on issues:

```bash
# Simulate having issues (will set color based on current time)
pipenv run python punch-light-controller.py update true

# Simulate no issues (will set soft green)
pipenv run python punch-light-controller.py update false
```

### 4. Set Up Native Messaging for Extension

The extension communicates with this Python script using "native messaging".

#### Step 1: Make the wrapper script executable

```bash
chmod +x punch-light-wrapper.sh
```

#### Step 2: Update the manifest path

Edit `com.punchup.light.json` and replace the placeholder path with your actual path:

```json
{
  "path": "/Users/YOUR_USERNAME/dir/punch-up-light/python/punch-light-wrapper.sh"
}
```

#### Step 3: Install the native messaging manifest

On macOS, copy the manifest to the Firefox native messaging directory:

```bash
# Create the directory if it doesn't exist
mkdir -p ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/

# Copy the manifest
cp com.punchup.light.json ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/
```

#### Step 4: Update Firefox extension manifest

The extension needs permission to use native messaging. This has been added to `extension/firefox/manifest.json`.

### 5. Reload the Firefox Extension

1. Open Firefox
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Reload" on the Punch-Up Light extension

## How It Works

### Color Warning System

The light provides different colors based on whether there are issues:

#### When Issues Exist

- **Monday 5pm - Friday 9am**: Gradient from **yellow (HSV 60,100,100)** to **red (HSV 0,100,100)**
  - The color gets redder each day
  - By Friday 9am it's deep red
- **All other times**: **Bright red (HSV 0,100,100)**
  - Monday 9am - 5pm
  - Friday 9am - Monday 5pm (weekend)

#### When No Issues

- **Soft green (HSV 105,60,40)**
  - A calm, subtle green indicating all is well

### When the Light Updates

The light will automatically update:
1. When you visit the PunchIt page (instant update via extension)
2. Every 12 hours in the background (to keep time-based colors current)
3. When the extension detects changes in punch status

The Python script receives messages like:
```json
{
  "action": "update_light",
  "hasIssues": true
}
```

And responds with:
```json
{
  "status": "ok",
  "action": "on",
  "color": {"hue": 45, "saturation": 100, "value": 100}
}
```

## Testing Native Messaging

To test that native messaging is working:

1. Open Firefox Developer Tools console
2. Open the Punch-Up extension popup
3. Visit punchit.atomicobject.com/newpunch.php
4. Check the browser console for messages about the light controller

You should see logs in the Python side (check system logs or run manually):

```bash
# Run in native messaging mode manually for debugging
pipenv run python punch-light-controller.py native
# Then send a test message (won't work from terminal, needs stdin)
```

## Troubleshooting

### Light not discovered

- Make sure the light is on and connected to WiFi
- Try running `pipenv run python punch-light-controller.py discover` again
- Check that your computer and light are on the same network

### Native messaging not working

- Verify the manifest is in the correct location:
  ```bash
  ls -la ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/com.punchup.light.json
  ```
- Check that the path in the manifest is absolute and correct
- Make sure the wrapper script is executable: `ls -la punch-light-wrapper.sh`
- Check Firefox's browser console for native messaging errors

### Light doesn't change color

- Check the time - the warning only shows Monday 5pm - Friday
- Verify the light supports HSV colors (most color Kasa bulbs do)
- Run the manual set command to test: `pipenv run python punch-light-controller.py set 60 100 100`

## Command Reference

```bash
# Set up a new light (WiFi wizard)
pipenv run python punch-light-controller.py setup

# Discover light on network
pipenv run python punch-light-controller.py discover

# Update light based on issues
pipenv run python punch-light-controller.py update true   # Has issues
pipenv run python punch-light-controller.py update false  # No issues (soft green)

# Set specific HSV color
pipenv run python punch-light-controller.py set <hue> <saturation> <value>
# Example: Yellow
pipenv run python punch-light-controller.py set 60 100 100

# Turn off light
pipenv run python punch-light-controller.py off

# Run in native messaging mode (used by Firefox)
pipenv run python punch-light-controller.py native
```

## Color Reference

Punch-Up Light colors:
- **Soft Green (no issues)**: `105 60 40`
- **Yellow (warning start)**: `60 100 100`
- **Red (warning end)**: `0 100 100`

Other useful HSV colors:
- Bright Green: `120 100 100`
- Cyan: `180 100 100`
- Blue: `240 100 100`
- Magenta: `300 100 100`
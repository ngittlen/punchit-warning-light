#!/usr/bin/env python3
"""
Punch-Up Light Controller
Controls a Kasa smart light based on PunchIt issues.

The light warns about punch issues with a color that gets more urgent over time:
- Monday 9am - Monday 5pm: Bright red
- Monday 5pm - Friday 9am: Yellow to Red gradient
- Friday 9am - Friday 5pm: Bright red
- Friday 5pm - Monday 9am: Bright red
"""

import asyncio
import sys
import json
import struct
import datetime
import math
import getpass
import os
from pathlib import Path
from kasa import Discover, Module

# Path to cache file for storing light IP address (in same directory as script)
SCRIPT_DIR = Path(__file__).parent.resolve()
CACHE_FILE = SCRIPT_DIR / "punch-light-cache.json"


def load_cached_ip():
    """Load cached light IP address from file."""
    try:
        if CACHE_FILE.exists():
            with open(CACHE_FILE, 'r') as f:
                data = json.load(f)
                return data.get('host')
    except Exception as e:
        print(f"Warning: Failed to load cached IP: {e}", file=sys.stderr)
    return None


def save_cached_ip(host):
    """Save light IP address to cache file."""
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump({'host': host}, f)
        print(f"Cached light IP: {host}", file=sys.stderr)
    except Exception as e:
        print(f"Warning: Failed to save cached IP: {e}", file=sys.stderr)


async def connect_light_to_wifi():
    """
    Setup wizard to connect a new Kasa light to WiFi.
    This is used when the light is brand new or has been reset.
    """
    print("Setting up new Kasa light")
    print("=" * 50)
    input("1. Reset your light (turn on/off 3 times quickly)\n"
          "2. Connect to the light's WiFi network (TP-Link_Smart Bulb_####)\n"
          "3. Press Enter to continue...")

    print("\nLooking for devices...")
    found_devices = await Discover.discover()

    if len(found_devices) < 1:
        print("No devices found. Make sure you are connected to the light's WiFi network.")
        print("The network should look like: TP-Link_Smart Bulb_#### or similar.")
        sys.exit(1)

    # Get the first device found
    device = next(iter(found_devices.values()))
    await device.update()
    print(f"Found device: {device.alias}")

    # Get WiFi credentials from user
    network = input("\nEnter the name of your WiFi network: ")
    password = getpass.getpass("Enter the WiFi password: ")
    encryption_type = input("Enter encryption type (leave blank for 'wpa2_psk (3)', or use 0, 1, or 2, for other encryption types): ").strip()

    if not encryption_type:
        encryption_type = "3"

    # Connect the light to the WiFi network
    print(f"\nConnecting light to '{network}'...")
    try:
        await device.wifi_join(network, password, encryption_type)
        # Clear password from memory immediately after use for security
        del password
        print("\n" + "=" * 50)
        print("Light attempting to connect to your wifi network.")
        print("If it succeeds it will flash primary colors. If it fails it will flash shades of white")
        print("and the light's wifi network will become available again")
        print("=" * 50)
        input("\nReconnect your computer to your normal WiFi network and press Enter...")

        print("\nDiscovering light on your network...")
        # Give the light a moment to connect
        await asyncio.sleep(2)

        # Try to discover the light on the new network
        new_devices = await Discover.discover()
        if new_devices:
            new_device = next(iter(new_devices.values()))
            await new_device.update()
            print(f"\nFound light at: {new_device.host}")
            print(f"Alias: {new_device.alias}")

            # Save the IP to cache
            save_cached_ip(new_device.host)

            print("\nSetup complete! You can now use the light with this script.")
        else:
            print("\nCouldn't find the light on your network yet.")
            print("It may take a minute to connect. Try running:")
            print("  python punch-light-controller.py discover")

    except Exception as e:
        # Clear password from memory in case of error
        try:
            del password
        except NameError:
            pass  # Password already deleted

        print(f"\nError connecting light to WiFi: {e}")
        print("\nTroubleshooting:")
        print("- Make sure the WiFi password is correct")
        print("- Check that your WiFi network is 2.4GHz (most Kasa lights don't support 5GHz)")
        print("- Try resetting the light and running setup again")
        sys.exit(1)


class PunchLightController:
    def __init__(self, host=None):
        self.host = host
        self.device = None
        self.light = None  # Light module
        self.last_has_issues = None  # Track last known issue state
        self.periodic_task = None  # Background periodic update task

    async def discover_light(self):
        """Discover a Kasa light on the network, using cached IP if available."""
        if self.host:
            # Connect to specific host provided by user
            print(f"Connecting to specified host: {self.host}", file=sys.stderr)
            self.device = await Discover.discover_single(self.host)
        else:
            # Try cached IP first
            cached_ip = load_cached_ip()
            if cached_ip:
                try:
                    print(f"Trying cached IP: {cached_ip}", file=sys.stderr)
                    self.device = await Discover.discover_single(cached_ip)
                    await self.device.update()

                    # Verify it's still a light with Light module
                    if Module.Light in self.device.modules:
                        print(f"Successfully connected using cached IP", file=sys.stderr)
                    else:
                        # Cached device is not a light anymore, need to rediscover
                        print(f"Cached device is not a light, rediscovering...", file=sys.stderr)
                        self.device = None
                except Exception as e:
                    print(f"Failed to connect to cached IP: {e}", file=sys.stderr)
                    print(f"Performing discovery...", file=sys.stderr)
                    self.device = None

            # If no cached IP or connection failed, do discovery
            if not self.device:
                found_devices = await Discover.discover()
                if len(found_devices) == 0:
                    raise Exception("No devices found. Make sure your light is powered on, or run 'python punch-light-controller.py setup' to configure a new light.")
                elif len(found_devices) == 1:
                    self.device = next(iter(found_devices.values()))
                else:
                    # Filter for lights only - check if device has Light module
                    lights = [d for d in found_devices.values() if Module.Light in d.modules]
                    if len(lights) == 0:
                        raise Exception("No light devices found.")
                    elif len(lights) == 1:
                        self.device = lights[0]
                    else:
                        raise Exception(f"Multiple lights found. Please specify host IP.")

                # Save the discovered IP to cache
                save_cached_ip(self.device.host)

        await self.device.update()

        # Get the Light module and verify it has HSV support
        if Module.Light not in self.device.modules:
            raise Exception(f"Device {self.device.alias} is not a light.")

        self.light = self.device.modules[Module.Light]

        if not self.light.has_feature("hsv"):
            raise Exception(f"Light {self.device.alias} doesn't support HSV color control.")

        print(f"Connected to light: {self.device.alias} at {self.device.host}", file=sys.stderr)
        return self.device.host

    def get_warning_color(self):
        """
        Calculate the HSV color based on current time and warning urgency.

        Returns tuple of (hue, saturation, value) where:
        - Monday 5pm - Friday 9am: Gradient from yellow (60) to red (0)
        - All other periods: Bright red (0, 100, 100)
        """
        now = datetime.datetime.now()
        weekday = now.weekday()  # 0=Monday, 4=Friday, 5=Saturday, 6=Sunday
        hour = now.hour

        # Calculate the gradient period boundaries (Monday 5pm - Friday 9am)
        monday_5pm = now.replace(hour=17, minute=0, second=0, microsecond=0)
        monday_5pm -= datetime.timedelta(days=weekday)  # Go back to this week's Monday
        friday_9am = monday_5pm + datetime.timedelta(days=4, hours=-8)  # 4 days - 8 hours = Friday 9am

        # Check if we're in the gradient period (Monday 5pm - Friday 9am)
        if monday_5pm <= now < friday_9am:
            # Calculate progression from yellow to red
            total_duration = (friday_9am - monday_5pm).total_seconds()
            elapsed = (now - monday_5pm).total_seconds()
            progress = elapsed / total_duration
            hue = int(60 * (1 - progress))  # Interpolate from yellow (60) to red (0)
            return (hue, 100, 100)

        return (0, 100, 100)

    async def periodic_update_loop(self):
        """Background task that updates the light every 12 hours based on stored state."""
        while True:
            try:
                # Wait 12 hours
                await asyncio.sleep(12 * 60 * 60)  # 12 hours in seconds

                # Update light if we have a known state
                if self.last_has_issues is not None:
                    print(f"Periodic update (12h): has_issues={self.last_has_issues}", file=sys.stderr)
                    await self.update_light(self.last_has_issues)
                else:
                    print("Periodic update skipped: no punch data available yet", file=sys.stderr)

            except Exception as e:
                print(f"Error in periodic update loop: {e}", file=sys.stderr)
                # Continue despite errors - don't break the loop
                await asyncio.sleep(60)  # Wait a minute before retrying

    async def update_light(self, has_issues):
        """
        Update the light based on whether there are punch issues.

        Args:
            has_issues: Boolean indicating if there are punch issues
        """
        if not self.device:
            await self.discover_light()

        await self.device.update()

        if not self.device.is_on:
            await self.device.turn_on()

        # Store the current state for periodic updates
        self.last_has_issues = has_issues

        if not has_issues:
            # No issues - set to soft cool green

            hue, saturation, value = 105, 60, 40
            await self.light.set_hsv(hue, saturation, value)
            await self.device.update()

            print(f"Light set to soft green (no issues): HSV({hue}, {saturation}, {value})", file=sys.stderr)
            return {
                "status": "ok",
                "action": "on",
                "color": {"hue": hue, "saturation": saturation, "value": value},
                "mode": "no_issues"
            }

        # There are issues - determine the color
        color = self.get_warning_color()

        if color is None:
            if self.device.is_on:
                await self.device.turn_off()
                print("Light turned off", file=sys.stderr)
            return {"status": "ok", "action": "off", "reason": "light_off"}

        # Set color using the Light module
        hue, saturation, value = color
        await self.light.set_hsv(hue, saturation, value)
        await self.device.update()

        print(f"Light set to HSV({hue}, {saturation}, {value})", file=sys.stderr)
        return {
            "status": "ok",
            "action": "on",
            "color": {"hue": hue, "saturation": saturation, "value": value}
        }

    async def set_color(self, hue, saturation, value):
        """Manually set the light to a specific HSV color."""
        if not self.device:
            await self.discover_light()

        await self.device.update()

        if not self.device.is_on:
            await self.device.turn_on()

        await self.light.set_hsv(hue, saturation, value)
        await self.device.update()

        print(f"Light manually set to HSV({hue}, {saturation}, {value})", file=sys.stderr)
        return {
            "status": "ok",
            "color": {"hue": hue, "saturation": saturation, "value": value}
        }

    async def turn_off(self):
        """Turn off the light."""
        if not self.device:
            await self.discover_light()

        await self.device.update()

        if self.device.is_on:
            await self.device.turn_off()

        print("Light turned off", file=sys.stderr)
        return {"status": "ok", "action": "off"}


# Constants for validation
MAX_MESSAGE_SIZE = 1024 * 1024  # 1MB max message size to prevent DoS
ALLOWED_ACTIONS = {'update_light', 'set_color', 'turn_off', 'discover'}

# HSV validation ranges
HSV_HUE_MIN = 0
HSV_HUE_MAX = 360
HSV_SAT_MIN = 0
HSV_SAT_MAX = 100
HSV_VAL_MIN = 0
HSV_VAL_MAX = 100


def validate_hsv(hue, saturation, value):
    """
    Validate HSV color values are within acceptable ranges.

    Args:
        hue: Hue value (0-360 degrees on color wheel)
        saturation: Saturation percentage (0-100)
        value: Value/brightness percentage (0-100)

    Returns:
        tuple: Validated and converted (hue, saturation, value) as integers

    Raises:
        ValueError: If any value is out of range or not a number
    """
    try:
        hue = float(hue)
        saturation = float(saturation)
        value = float(value)
    except (TypeError, ValueError) as e:
        raise ValueError(f"HSV values must be numeric: {e}")

    if not (HSV_HUE_MIN <= hue <= HSV_HUE_MAX):
        raise ValueError(f"Invalid hue: {hue} (must be {HSV_HUE_MIN}-{HSV_HUE_MAX})")

    if not (HSV_SAT_MIN <= saturation <= HSV_SAT_MAX):
        raise ValueError(f"Invalid saturation: {saturation} (must be {HSV_SAT_MIN}-{HSV_SAT_MAX})")

    if not (HSV_VAL_MIN <= value <= HSV_VAL_MAX):
        raise ValueError(f"Invalid value: {value} (must be {HSV_VAL_MIN}-{HSV_VAL_MAX})")

    return int(hue), int(saturation), int(value)


# Native messaging functions for browser extension
def get_message():
    """
    Read a message from stdin (from extension).

    Returns:
        dict: Parsed JSON message from browser extension
        None: If no message available (EOF)

    Raises:
        ValueError: If message is too large (potential DoS attack)
        json.JSONDecodeError: If message is not valid JSON
    """
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None

    message_length = struct.unpack('=I', raw_length)[0]

    if message_length > MAX_MESSAGE_SIZE:
        raise ValueError(
            f"Message too large: {message_length} bytes "
            f"(max allowed: {MAX_MESSAGE_SIZE} bytes). "
        )

    if message_length == 0:
        raise ValueError("Empty message received")

    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)


def send_message(message):
    """Send a message to stdout (to extension)."""
    encoded_message = json.dumps(message).encode('utf-8')
    encoded_length = struct.pack('=I', len(encoded_message))
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_message)
    sys.stdout.buffer.flush()


async def handle_message(controller, message):
    """
    Handle a message from the extension.

    Args:
        controller: PunchLightController instance
        message: dict containing action and parameters

    Returns:
        dict: Response message with status and results

    Raises:
        ValueError: If message format is invalid or action is not allowed
    """
    if not isinstance(message, dict):
        return {"status": "error", "message": "Invalid message format: must be a JSON object"}

    action = message.get('action')

    if not action:
        return {"status": "error", "message": "Missing 'action' field in message"}

    if action not in ALLOWED_ACTIONS:
        return {
            "status": "error",
            "message": f"Invalid action: '{action}'. Allowed actions: {', '.join(sorted(ALLOWED_ACTIONS))}"
        }

    # Handle each action with appropriate validation
    try:
        if action == 'update_light':
            has_issues = message.get('hasIssues', False)

            # Validate has_issues is a boolean
            if not isinstance(has_issues, bool):
                return {
                    "status": "error",
                    "message": f"Invalid hasIssues value: must be boolean, got {type(has_issues).__name__}"
                }

            result = await controller.update_light(has_issues)
            return result

        elif action == 'set_color':
            hue = message.get('hue', 0)
            saturation = message.get('saturation', 100)
            value = message.get('value', 100)

            try:
                hue, saturation, value = validate_hsv(hue, saturation, value)
            except ValueError as e:
                return {"status": "error", "message": str(e)}

            result = await controller.set_color(hue, saturation, value)
            return result

        elif action == 'turn_off':
            result = await controller.turn_off()
            return result

        elif action == 'discover':
            host = await controller.discover_light()
            return {"status": "ok", "host": host, "alias": controller.device.alias}

    except Exception as e:
        return {
            "status": "error",
            "message": f"Error executing action '{action}': {str(e)}"
        }


async def main_native_messaging():
    """Main loop for native messaging with browser extension."""
    controller = PunchLightController()

    # Try to discover light on startup
    try:
        await controller.discover_light()
    except Exception as e:
        print(f"Warning: Could not discover light on startup: {e}", file=sys.stderr)

    # Start periodic update task in background
    controller.periodic_task = asyncio.create_task(controller.periodic_update_loop())
    print("Started periodic update task (12h interval)", file=sys.stderr)

    # Process messages from browser
    while True:
        try:
            message = get_message()
            if message is None:
                break

            print(f"Received message: {message}", file=sys.stderr)

            result = await handle_message(controller, message)
            send_message(result)

        except Exception as e:
            error_msg = {"status": "error", "message": str(e)}
            print(f"Error: {e}", file=sys.stderr)
            send_message(error_msg)


async def main_cli():
    """Command-line interface for testing."""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python punch-light-controller.py setup      # Connect a new light to WiFi")
        print("  python punch-light-controller.py discover   # Find light on network")
        print("  python punch-light-controller.py update <has_issues>")
        print("  python punch-light-controller.py set <hue> <sat> <val>")
        print("  python punch-light-controller.py off")
        print("  python punch-light-controller.py native     # Run in native messaging mode")
        return

    command = sys.argv[1]

    if command == 'setup':
        await connect_light_to_wifi()
        return

    controller = PunchLightController()

    if command == 'discover':
        host = await controller.discover_light()
        print(f"Found light at {host}")
        print(f"Alias: {controller.device.alias}")

    elif command == 'update':
        has_issues = sys.argv[2].lower() in ('true', '1', 'yes') if len(sys.argv) > 2 else False
        result = await controller.update_light(has_issues)
        print(json.dumps(result, indent=2))

    elif command == 'set':
        try:
            hue = int(sys.argv[2]) if len(sys.argv) > 2 else 0
            sat = int(sys.argv[3]) if len(sys.argv) > 3 else 100
            val = int(sys.argv[4]) if len(sys.argv) > 4 else 100

            hue, sat, val = validate_hsv(hue, sat, val)

            result = await controller.set_color(hue, sat, val)
            print(json.dumps(result, indent=2))
        except ValueError as e:
            print(f"Error: {e}", file=sys.stderr)
            print(f"Usage: python punch-light-controller.py set <hue(0-360)> <saturation(0-100)> <value(0-100)>", file=sys.stderr)
            sys.exit(1)

    elif command == 'off':
        result = await controller.turn_off()
        print(json.dumps(result, indent=2))

    elif command == 'native':
        await main_native_messaging()

    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    asyncio.run(main_cli())
# Privacy Policy for Punch-Up Light

**Last Updated:** December 12, 2025

## Overview

Punch-Up Light is a browser extension that helps you monitor punch issues from punchit.atomicobject.com by controlling a Kasa smart light.

## Data Collection and Storage

**We do not collect, store, or transmit any personal information.**

### What Data is Processed

The extension processes the following data locally on your device:
- Punch issue information scraped from punchit.atomicobject.com (dates and descriptions)
- Timestamp of your last visit to the PunchIt page
- Light status and color settings

### How Data is Stored

All data is stored locally in your browser using the Chrome Storage API:
- Data never leaves your device
- Data is not transmitted to any external servers
- Data is not shared with any third parties
- Data is not accessible to the extension developer

### Local Communication Only

The extension communicates exclusively with:
- **Your local computer:** Via Chrome's native messaging protocol to control your Kasa smart light
- **punchit.atomicobject.com:** Only to read punch data from pages you visit (read-only access)

No data from the extension is sent to any external servers or services.

## Permissions Explanation

The extension requests the following permissions:

- **storage:** To save punch data and settings locally in your browser
- **nativeMessaging:** To communicate with a Python script running locally on your computer
- **alarms:** To schedule periodic checks for stale data
- **host_permissions (punchit.atomicobject.com):** To read punch issue data from the PunchIt website

## Data Deletion

You can delete all data stored by this extension at any time:

1. Open Chrome and go to `chrome://extensions/`
2. Find "Punch-Up Light" and click "Remove"
3. All locally stored data will be permanently deleted

Alternatively, you can clear specific data:
1. Right-click the extension icon
2. Select "Manage extension"
3. Click "Clear storage"

## Third-Party Services

This extension does not use any third-party analytics, tracking, or advertising services.

## Changes to This Policy

Any changes to this privacy policy will be reflected in this document with an updated "Last Updated" date.

## Contact

For questions about this privacy policy or the extension's data practices, please visit:
https://github.com/ngittlen/punchit-warning-light

## Your Rights

Since no personal data is collected or transmitted, there is no data to request, modify, or delete from external servers. All data exists only on your local device under your complete control.
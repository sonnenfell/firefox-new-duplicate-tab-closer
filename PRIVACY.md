# Privacy Policy for Close New Duplicate Tabs

**Effective Date: November 2025**

This policy explains how the **Close New Duplicate Tabs** Firefox WebExtension handles user data.

## 1. Data Collection

### **This extension does not collect, store, transmit, or share any personal data.**

The **Close New Duplicate Tabs** extension operates entirely locally within your Firefox browser.

* **No User Data:** The extension does not track your browsing history, usage patterns, IP address, or any other personally identifiable information.
* **No Telemetry:** The extension does not use any services to send data back to the developer (Sunfur) or any third party.
* **No Third-Party Services:** The extension does not connect to any external websites or services (APIs, analytics, etc.).

## 2. Data Usage

The extension uses the standard Firefox WebExtensions `tabs` API **only** for the following, localized operations:

1.  Reading the URL of a newly created tab.
2.  Querying the URLs of other open tabs to check for a duplicate match.
3.  Closing the newly created tab if a duplicate is found.
4.  Switching focus to the existing, original tab.

All data used for these purposes remains within your local browser memory and is discarded immediately after the duplicate check is complete.

## 3. Policy Changes

Any future changes to this policy will be clearly communicated by updating this `PRIVACY.md` file in the GitHub repository and updating the extension's version and associated data collection manifest flags.

## 4. Contact Information

If you have any questions regarding this privacy policy, please open an issue on the repository:

https://github.com/sonnenfell/firefox-new-duplicate-tab-closer/issues

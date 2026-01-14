## Close New Duplicate Tabs (Firefox WebExtension)

This small Firefox WebExtension automatically detects and closes a tab immediately after it is created if the same URL is already open in another tab.

This functionality specifically targets links clicked to open in a new tab (e.g., Ctrl+Click or Middle Mouse Button) and ignores tabs that simply navigate to a duplicate URL after they have been open for some time. It also ignores new tabs that open to the default Firefox start page (`about:newtab`).

*This extension runs locally and does not collect or store any data. See all deatails on this in in [PRIVACY.md](https://github.com/sonnenfell/firefox-new-duplicate-tab-closer/blob/main/PRIVACY.md)*

# How to install
Simply head this extensions [Firefox Add-on page](https://addons.mozilla.org/en-US/firefox/addon/close-new-duplicate-tabs/) and click on "Add to Firefox". The extension will then be automatically installed.

## Planned features in future updates:
Based on some feedback (and my own exeprience as well), I plan to add some functionality to this plugin, with options being the main focus. The features I'm currently thinking of are:
- click extension icon in toolbar to toggle on/off
- only switch tab focus if the currently focussed tab is the one being closed by this extension
- simple options menu:
  - choose wether to close the newer or older duplicate tab by default
  - option to always prefer closing an unloaded ("asleep") tab
  - pinned tabs behaviour options:
    - completely ignore pinned tabs
    - never close a pinned tab (always close the other tab instead)
    - treat like any other tab

If you have any other useful (and realistic) features for this extension in mind, use the Issues tab to request.

_Of course everyone who wishes to can also directly contribute to this extension - simply make a pull request and I will accept it if there are no bugs/compliance issues._

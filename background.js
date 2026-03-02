// A simple function to check if a URL is valid (not 'about:blank', 'about:newtab', etc.)
function isValidUrl(url) {
    return url && !url.startsWith("about:") && !url.startsWith("moz-extension:");
}

// 1. Listen for when a new tab is created
browser.tabs.onCreated.addListener((newTab) => {
  // 2. Add another listener to monitor THIS new tab's updates
  // We need to wait until the tab has finished loading its initial URL
  const updateListener = (tabId, changeInfo, tab) => {
    
    // Check if the update belongs to our new tab and is complete
    if (tabId === newTab.id && changeInfo.status === "complete") {
      
      // If the URL is valid, proceed with the duplicate check
      if (isValidUrl(tab.url)) {
        
        // Retrieve all settings
        browser.storage.local.get(null).then(settings => {
          // Check if extension is enabled (default to true)
          if (settings.enableExtension === false) {
            browser.tabs.onUpdated.removeListener(updateListener);
            return;
          }
          
          const duplicateBehaviour = settings.duplicateTabBehaviour || 'keepOlder';
          const pinnedBehaviour = settings.pinnedTabsBehaviour || 'neverClosePinned';
          
          // If duplicate tab behaviour is set to "do nothing", skip processing
          if (duplicateBehaviour === 'doNothing') {
            browser.tabs.onUpdated.removeListener(updateListener);
            return;
          }
          
          // If ignoring pinned tabs and the new tab is pinned, skip duplicate check
          if (pinnedBehaviour === 'ignorePinned' && tab.pinned) {
            browser.tabs.onUpdated.removeListener(updateListener);
            return;
          }
          
          // 3. Query all other tabs
          browser.tabs.query({}).then((allTabs) => {
            let duplicateTabs = allTabs.filter(otherTab => otherTab.id !== newTab.id && isDuplicate(tab, otherTab, settings));

            if (duplicateTabs.length > 0) {
              
              // Filter out pinned tabs if ignoring them
              let filteredDuplicateTabs = duplicateTabs;
              if (pinnedBehaviour === 'ignorePinned') {
                filteredDuplicateTabs = duplicateTabs.filter(t => !t.pinned);
              }
              
              // If no duplicates after filtering, skip
              if (filteredDuplicateTabs.length === 0) {
                browser.tabs.onUpdated.removeListener(updateListener);
                return;
              }
              
              // 4. A duplicate was found! Find the original tab (the one that wasn't just created).
              let originalTab = filteredDuplicateTabs[0]; // First found duplicate
              
              if (originalTab) {
                // Check if the new tab is being created from the currently active tab
                browser.tabs.query({ active: true, currentWindow: true }).then((activeTabs) => {
                  const activeTab = activeTabs[0];
                  const isExplicitDuplicate = activeTab && isDuplicate(tab, activeTab, settings);
                  
                  // If explicitly duplicating and the setting is enabled, keep the duplicate
                  if (isExplicitDuplicate && settings.keepDuplicateExplicit) {
                    // Keep the new duplicate tab (browser handles focus by default)
                  } else if (duplicateBehaviour === 'keepNewer') {
                    // 5b. Close the original tab and keep the new duplicate tab.
                    browser.tabs.remove(originalTab.id);
                    if (settings.focusNewTab) {
                      // Focus the new tab if the sub-setting is enabled
                      browser.tabs.update(newTab.id, { active: true });
                    }
                  } else {
                    // 5a. Keep the older tab and close the new duplicate tab.
                    // Determine which tab to close based on unloaded preference and pinned tabs behaviour
                    let tabToClose = newTab.id;
                    let tabToFocus = originalTab.id;
                    
                    // Check if we should prefer closing unloaded tabs
                    if (settings.preferClosingUnloaded) {
                      const newTabDiscarded = tab.discarded;
                      const originalTabDiscarded = originalTab.discarded;
                      
                      // If one tab is unloaded and the other isn't, close the unloaded one
                      if (newTabDiscarded && !originalTabDiscarded) {
                        tabToClose = newTab.id;
                        tabToFocus = originalTab.id;
                      } else if (!newTabDiscarded && originalTabDiscarded) {
                        tabToClose = originalTab.id;
                        tabToFocus = newTab.id;
                      }
                      // If both are loaded or both are unloaded, use pinned tab behaviour
                    }
                    
                    // Apply pinned tabs behaviour if applicable
                    if (pinnedBehaviour === 'neverClosePinned') {
                      // Check current tabToClose - if it's pinned, swap
                      if (tabToClose === newTab.id && tab.pinned && !originalTab.pinned) {
                        tabToClose = originalTab.id;
                        tabToFocus = newTab.id;
                      } else if (tabToClose === originalTab.id && originalTab.pinned && !tab.pinned) {
                        tabToClose = newTab.id;
                        tabToFocus = originalTab.id;
                      }
                    }
                    
                    // 5a. Switch to the tab that will remain and close the duplicate tab.
                    
                    // Change focus to the tab that will remain if the setting is enabled
                    if (settings.changeFocusOnRemove !== false) {
                      browser.tabs.update(tabToFocus, { active: true });
                    }
                    
                    // Close the duplicate tab
                    browser.tabs.remove(tabToClose);
                  }
                });
              }
            }
            
            // IMPORTANT: Remove this update listener once the check is done, 
            // regardless of the outcome, to avoid unnecessary execution later.
            browser.tabs.onUpdated.removeListener(updateListener);
          });
        });
      }
    }
  };

  // Attach the temporary listener to the new tab
  browser.tabs.onUpdated.addListener(updateListener);
});

// Function to close all duplicate tabs
async function closeAllDuplicates() {
    const settings = await browser.storage.local.get(null);
    const tabs = await browser.tabs.query({});
    const duplicates = [];
    const seen = [];

    tabs.forEach(tab => {
        let isDuplicateTab = false;
        for (let i = 0; i < seen.length; i++) {
            if (isDuplicate(tab, seen[i], settings)) {
                isDuplicateTab = true;
                duplicates.push(tab.id);
                break;
            }
        }
        if (!isDuplicateTab) {
            seen.push(tab);
        }
    });

    if (duplicates.length > 0) {
        await browser.tabs.remove(duplicates);
    }
}

// Handle extension icon click based on selected behaviour
browser.browserAction.onClicked.addListener(async () => {
    const settings = await browser.storage.local.get(null);
    const behaviour = settings.iconClickBehaviour || 'openOptionsTab';

    if (behaviour === 'toggleExtension') {
        const newState = settings.enableExtension === false ? true : false;
        await browser.storage.local.set({ enableExtension: newState });
    } else if (behaviour === 'openOptionsTab') {
        browser.tabs.create({ url: browser.runtime.getURL('options/options.html') });
    } else if (behaviour === 'closeAllDuplicates') {
        closeAllDuplicates();
    } else if (behaviour === 'openOptionsAddon') {
        browser.runtime.openOptionsPage();
    } else {
        browser.runtime.openOptionsPage();
    }
});

// Create context menu for closing all duplicate tabs
browser.menus.create({
  id: "close-all-duplicate-tabs",
  title: "Close all duplicate tabs",
  contexts: ["tab"]
});

// Handle context menu click
browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "close-all-duplicate-tabs") {
    closeAllDuplicates();
  }
});

console.log("Close New Duplicate Tabs extension loaded.");
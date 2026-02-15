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
        
        // Retrieve settings including duplicate tab behaviour and other options
        browser.storage.local.get(['enableExtension', 'duplicateTabBehaviour', 'focusNewTab', 'keepDuplicateExplicit', 'changeFocusOnRemove', 'pinnedTabsBehaviour', 'preferClosingUnloaded']).then(result => {
          // Check if extension is enabled (default to true)
          if (result.enableExtension === false) {
            browser.tabs.onUpdated.removeListener(updateListener);
            return;
          }
          
          const duplicateBehaviour = result.duplicateTabBehaviour || 'keepOlder';
          const pinnedBehaviour = result.pinnedTabsBehaviour || 'neverClosePinned';
          
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
          
          // 3. Query all other tabs for the same URL
          browser.tabs.query({ url: tab.url }).then((duplicateTabs) => {
            
            // The query will include the new tab itself, so we check for more than one result.
            if (duplicateTabs.length > 1) {
              
              // Filter out pinned tabs if ignoring them
              let filteredDuplicateTabs = duplicateTabs;
              if (pinnedBehaviour === 'ignorePinned') {
                filteredDuplicateTabs = duplicateTabs.filter(t => !t.pinned);
              }
              
              // If no duplicates after filtering, skip
              if (filteredDuplicateTabs.length <= 1) {
                browser.tabs.onUpdated.removeListener(updateListener);
                return;
              }
              
              // 4. A duplicate was found! Find the original tab (the one that wasn't just created).
              let originalTab = filteredDuplicateTabs.find(t => t.id !== newTab.id);
              
              if (originalTab) {
                // Check if the new tab is being created from the currently active tab
                browser.tabs.query({ active: true, currentWindow: true }).then((activeTabs) => {
                  const activeTab = activeTabs[0];
                  const isExplicitDuplicate = activeTab && activeTab.url === tab.url;
                  
                  // If explicitly duplicating and the setting is enabled, keep the duplicate
                  if (isExplicitDuplicate && result.keepDuplicateExplicit) {
                    // Keep the new duplicate tab (browser handles focus by default)
                  } else if (duplicateBehaviour === 'keepNewer') {
                    // 5b. Close the original tab and keep the new duplicate tab.
                    browser.tabs.remove(originalTab.id);
                    if (result.focusNewTab) {
                      // Focus the new tab if the sub-setting is enabled
                      browser.tabs.update(newTab.id, { active: true });
                    }
                  } else {
                    // 5a. Keep the older tab and close the new duplicate tab.
                    // Determine which tab to close based on unloaded preference and pinned tabs behaviour
                    let tabToClose = newTab.id;
                    let tabToFocus = originalTab.id;
                    
                    // Check if we should prefer closing unloaded tabs
                    if (result.preferClosingUnloaded) {
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
                    if (result.changeFocusOnRemove !== false) {
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

// Handle extension icon click based on selected behaviour
browser.browserAction.onClicked.addListener(async () => {
  const result = await browser.storage.local.get('iconClickBehaviour');
  const behaviour = result.iconClickBehaviour || 'openOptionsTab';
  
  if (behaviour === 'toggleExtension') {
    // Toggle enable/disable extension
    const settings = await browser.storage.local.get('enableExtension');
    const newState = settings.enableExtension === false ? true : false;
    await browser.storage.local.set({ enableExtension: newState });
  } else if (behaviour === 'openOptionsTab') {
    // Open options in a new tab
    browser.tabs.create({ url: browser.runtime.getURL('options/options.html') });
  } else if (behaviour === 'closeAllDuplicates') {
    // Close all duplicates
    const tabs = await browser.tabs.query({});
    const tabsByUrl = {};
    
    // Group tabs by URL
    tabs.forEach(tab => {
      const url = tab.url;
      if (!tabsByUrl[url]) {
        tabsByUrl[url] = [];
      }
      tabsByUrl[url].push(tab);
    });
    
    // Process each URL group
    for (const url in tabsByUrl) {
      const urlTabs = tabsByUrl[url];
      
      // Skip if only one tab with this URL
      if (urlTabs.length <= 1) {
        continue;
      }
      
      // Check if any tabs are pinned
      const pinnedTabs = urlTabs.filter(t => t.pinned);
      
      let tabsToRemove = [];
      
      if (pinnedTabs.length > 0) {
        // If there are pinned tabs, keep one pinned tab and remove all others
        tabsToRemove = urlTabs.filter(t => t.id !== pinnedTabs[0].id);
      } else {
        // If no pinned tabs, keep one tab and remove all others
        tabsToRemove = urlTabs.slice(1);
      }
      
      // Close all duplicate tabs
      const tabIdsToRemove = tabsToRemove.map(t => t.id);
      await browser.tabs.remove(tabIdsToRemove);
    }
  } else if (behaviour === 'openOptionsAddon') {
    // Default: open options in addon menu
    browser.runtime.openOptionsPage();
  } else {
    // Unknown behaviour, default to showing options in addon menu
    browser.runtime.openOptionsPage();
  }
});

console.log("Close New Duplicate Tabs extension loaded.");
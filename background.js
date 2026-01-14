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
        
        // 3. Query all other tabs for the same URL
        browser.tabs.query({ url: tab.url }).then((duplicateTabs) => {
          
          // The query will include the new tab itself, so we check for more than one result.
          if (duplicateTabs.length > 1) {
            
            // 4. A duplicate was found! Find the original tab (the one that wasn't just created).
            const originalTab = duplicateTabs.find(t => t.id !== newTab.id);
            
            if (originalTab) {
              // Check for keepNewTab setting
              browser.storage.local.get(['keepNewTab', 'focusNewTab']).then(result => {
                if (result.keepNewTab) {
                  // 5b. Close the original tab and keep the new duplicate tab.
                  browser.tabs.remove(originalTab.id);
                  if (result.focusNewTab) {
                    // Focus the new tab if the sub-setting is enabled
                    browser.tabs.update(newTab.id, { active: true });
                  }
                } else {
                  // 5a. Switch to the original tab and close the new duplicate tab.
                  
                  // Highlight the original tab
                  browser.tabs.update(originalTab.id, { active: true });
                  
                  // Close the new duplicate tab
                  browser.tabs.remove(newTab.id);
                }
              });
            }
          }
          
          // IMPORTANT: Remove this update listener once the check is done, 
          // regardless of the outcome, to avoid unnecessary execution later.
          browser.tabs.onUpdated.removeListener(updateListener);
        });
      }
    }
  };

  // Attach the temporary listener to the new tab
  browser.tabs.onUpdated.addListener(updateListener);
});

console.log("Close New Duplicate Tabs extension loaded.");
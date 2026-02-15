// Theme toggle functionality
function initTheme() {
  // Check if user has a saved preference, otherwise default to dark mode
  const themePreference = localStorage.getItem('theme') || 'dark';
  const themeToggle = document.getElementById('themeToggle');
  
  if (themePreference === 'light') {
    themeToggle.textContent = 'Dark Mode';
  } else {
    themeToggle.textContent = 'Light Mode';
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  
  if (html.classList.contains('light-mode')) {
    // Switch to dark mode
    html.classList.remove('light-mode');
    themeToggle.textContent = 'Light Mode';
    localStorage.setItem('theme', 'dark');
  } else {
    // Switch to light mode
    html.classList.add('light-mode');
    themeToggle.textContent = 'Dark Mode';
    localStorage.setItem('theme', 'light');
  }
}

document.getElementById('themeToggle').addEventListener('click', toggleTheme);

// hierarchy of settings
const dependencies = {
  'focusNewTab': 'duplicateTabBehaviour-keepNewer'
};

// Settings that should be disabled when extension is disabled
const extensionDependentElements = [
  'duplicateTabBehaviour',
  'focusNewTab',
  'keepDuplicateExplicit',
  'changeFocusOnRemove',
  'preferClosingUnloaded',
  'pinnedTabsBehaviour',
  'iconClickBehaviour',
  'closeAllDuplicatesBtn'
];

async function saveAllSettings() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const radios = document.querySelectorAll('input[type="radio"]:checked');
    const settings = {};    

    checkboxes.forEach(checkbox => {
        settings[checkbox.id] = checkbox.checked;
    });

    radios.forEach(radio => {
        settings[radio.name] = radio.value;
    });

    await browser.storage.local.set(settings);
}

// i.e if parent is unchecked, disable child
function updateUIStates() {
  const enableExtensionCheckbox = document.getElementById('enableExtension');
  const isExtensionEnabled = enableExtensionCheckbox.checked;
  
  // Lock/unlock extension-dependent elements
  extensionDependentElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    
    if (element instanceof HTMLInputElement && element.type === 'radio') {
      // Handle radio buttons
      const radioButtons = document.querySelectorAll(`input[name="${element.name}"]`);
      radioButtons.forEach(radio => {
        radio.disabled = !isExtensionEnabled;
      });
      const fieldset = element.closest('fieldset');
      if (fieldset) {
        const groupContainer = fieldset.closest('.setting-group');
        if (groupContainer) {
          groupContainer.style.opacity = isExtensionEnabled ? "1" : "0.5";
          groupContainer.style.pointerEvents = isExtensionEnabled ? "auto" : "none";
          groupContainer.style.cursor = isExtensionEnabled ? "auto" : "not-allowed";
        }
      }
    } else if (element) {
      element.disabled = !isExtensionEnabled;
      const groupContainer = element.closest('.setting-group');
      if (groupContainer) {
        groupContainer.style.opacity = isExtensionEnabled ? "1" : "0.5";
        groupContainer.style.pointerEvents = isExtensionEnabled ? "auto" : "none";
        groupContainer.style.cursor = isExtensionEnabled ? "auto" : "not-allowed";
      }
    }
  });
  
  // Handle checkbox-based dependencies
  Object.entries(dependencies).forEach(([childId, parentId]) => {
    const child = document.getElementById(childId);
    let parentEnabled = false;
    
    // Handle radio button dependencies
    if (parentId.includes('-')) {
      const [radioName, radioValue] = parentId.split('-');
      const radioButton = document.querySelector(`input[name="${radioName}"][value="${radioValue}"]:checked`);
      parentEnabled = radioButton !== null;
    } else {
      // Handle checkbox dependencies
      const parent = document.getElementById(parentId);
      parentEnabled = parent && parent.checked;
    }

    if (child) {
      child.disabled = !parentEnabled || !isExtensionEnabled;
      
      const container = child.closest('.setting-group');
      if (container) {
        container.style.opacity = (parentEnabled && isExtensionEnabled) ? "1" : "0.5";
        container.style.pointerEvents = (parentEnabled && isExtensionEnabled) ? "auto" : "none";
        container.style.cursor = (parentEnabled && isExtensionEnabled) ? "auto" : "not-allowed";
      }
    }
  });
}

async function init() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  const radios = document.querySelectorAll('input[type="radio"]');
  
  const keys = Array.from(checkboxes).map(cb => cb.id);
  const radioNames = [...new Set(Array.from(radios).map(r => r.name))];
  keys.push(...radioNames);
  
  const storage = await browser.storage.local.get(keys);

  checkboxes.forEach(cb => {
    // Default enableExtension to true, others to false
    const defaultValue = cb.id === 'enableExtension' ? true : false;
    cb.checked = storage[cb.id] ?? defaultValue;
    
    cb.addEventListener('change', async () => {
      updateUIStates();
      await saveAllSettings();
    });
  });

  radios.forEach(radio => {
    if (radio.name === 'pinnedTabsBehaviour') {
      radio.checked = storage[radio.name] === radio.value || (storage[radio.name] === undefined && radio.value === 'neverClosePinned');
    } else if (radio.name === 'duplicateTabBehaviour') {
      radio.checked = storage[radio.name] === radio.value || (storage[radio.name] === undefined && radio.value === 'keepOlder');
    } else if (radio.name === 'iconClickBehaviour') {
      radio.checked = storage[radio.name] === radio.value || (storage[radio.name] === undefined && radio.value === 'openOptionsTab');
    } else {
      radio.checked = storage[radio.name] === radio.value;
    }
    
    radio.addEventListener('change', async () => {
      updateUIStates();
      await saveAllSettings();
    });
  });

  updateUIStates();
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  init();
});

// Close all duplicates now functionality
document.getElementById('closeAllDuplicatesBtn').addEventListener('click', async () => {
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
  
  let totalClosed = 0;
  
  // Process each URL group
  for (const url in tabsByUrl) {
    const urlTabs = tabsByUrl[url];
    
    // Skip if only one tab with this URL
    if (urlTabs.length <= 1) {
      continue;
    }
    
    // Check if any tabs are pinned
    const pinnedTabs = urlTabs.filter(t => t.pinned);
    const unpinnedTabs = urlTabs.filter(t => !t.pinned);
    
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
    totalClosed += tabIdsToRemove.length;
  }
  
  // Show status message
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = `Closed ${totalClosed} duplicate tab${totalClosed !== 1 ? 's' : ''}.`;
  statusMessage.className = 'success';
  statusMessage.style.display = 'block';
  
  // Hide message after 3 seconds
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
});
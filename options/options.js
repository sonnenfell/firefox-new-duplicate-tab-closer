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
  'focusNewTab': 'duplicateTabBehaviour-keepNewer',
  'duplicateDefinitionOptions': 'customizeDuplicateDefinition',
  'customSearchStringKeywordsContainer': 'ignoreCustomSearchStrings'
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
  'customizeDuplicateDefinition'
];

async function saveAllSettings() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const radios = document.querySelectorAll('input[type="radio"]:checked');
    const numbers = document.querySelectorAll('input[type="number"]');
    const texts = document.querySelectorAll('input[type="text"]');
    const selects = document.querySelectorAll('select');
    const textareas = document.querySelectorAll('textarea');
    const settings = {};    

    checkboxes.forEach(checkbox => {
        settings[checkbox.id] = checkbox.checked;
    });

    radios.forEach(radio => {
        settings[radio.name] = radio.value;
    });

    numbers.forEach(number => {
        settings[number.id] = parseInt(number.value, 10);
    });

    texts.forEach(text => {
        settings[text.id] = text.value;
    });

    selects.forEach(select => {
        settings[select.id] = select.value;
    });

    textareas.forEach(textarea => {
        settings[textarea.id] = textarea.value;
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
      
      const container = child.closest('.setting-group, .sub-setting'); // Also check for .sub-setting
      if (container) {
        container.style.opacity = (parentEnabled && isExtensionEnabled) ? "1" : "0.5";
        container.style.pointerEvents = (parentEnabled && isExtensionEnabled) ? "auto" : "none";
        container.style.cursor = (parentEnabled && isExtensionEnabled) ? "auto" : "not-allowed";

        // Also disable inputs inside the container
        const inputs = container.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.disabled = !parentEnabled || !isExtensionEnabled;
        });
      }
    }
  });
}

async function init() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  const radios = document.querySelectorAll('input[type="radio"]');
  const numbers = document.querySelectorAll('input[type="number"]');
  const texts = document.querySelectorAll('input[type="text"]');
  const selects = document.querySelectorAll('select');
  const textareas = document.querySelectorAll('textarea');
  
  const keys = Array.from(checkboxes).map(cb => cb.id);
  const radioNames = [...new Set(Array.from(radios).map(r => r.name))];
  const numberIds = Array.from(numbers).map(num => num.id);
  const textIds = Array.from(texts).map(text => text.id);
  const selectIds = Array.from(selects).map(select => select.id);
  const textareaIds = Array.from(textareas).map(ta => ta.id);
  keys.push(...radioNames, ...numberIds, ...textIds, ...selectIds, ...textareaIds);
  
  const storage = await browser.storage.local.get(keys);

  checkboxes.forEach(cb => {
    // Default enableExtension to true, others to false
    let defaultValue = cb.id === 'enableExtension' ? true : false;
    if (cb.id === 'ignoreCustomSearchStrings') {
      defaultValue = true;
    }
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
    } else if (radio.name === 'duplicateCheckMethod') {
        radio.checked = storage[radio.name] === radio.value || (storage[radio.name] === undefined && radio.value === 'url');
    } else {
      radio.checked = storage[radio.name] === radio.value;
    }
    
    radio.addEventListener('change', async () => {
      updateUIStates();
      await saveAllSettings();
    });
  });

  numbers.forEach(number => {
    // No number inputs anymore, but keep for future use
    number.addEventListener('change', async () => {
        await saveAllSettings();
    });
  });

  texts.forEach(text => {
    text.value = storage[text.id] ?? '';
    
    text.addEventListener('change', async () => {
      await saveAllSettings();
    });
  });

  selects.forEach(select => {
    if (select.id === 'urlPathSections') {
      select.value = storage[select.id] ?? 'full';
    }
    
    select.addEventListener('change', async () => {
      await saveAllSettings();
    });
  });

  textareas.forEach(textarea => {
    if (textarea.id === 'customSearchStringKeywords') {
      const defaultKeywords = [
        'q=',
        'ref=',
        'search?',
        'tags='
      ].join('\n');
      textarea.value = storage[textarea.id] ?? defaultKeywords;
    } else {
      textarea.value = storage[textarea.id] ?? '';
    }

    textarea.addEventListener('change', async () => {
      await saveAllSettings();
    });
  });

  updateUIStates();
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  init();
});
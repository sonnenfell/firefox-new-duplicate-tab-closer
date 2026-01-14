// hierarchy of settings
const dependencies = {
  'focusNewTab': 'keepNewTab'
};

async function saveAllSettings() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const settings = {};    

    checkboxes.forEach(checkbox => {
        settings[checkbox.id] = checkbox.checked;
    });

    await browser.storage.local.set(settings);
}

// i.e if parent is unchecked, disable child
function updateUIStates() {
  Object.entries(dependencies).forEach(([childId, parentId]) => {
    const child = document.getElementById(childId);
    const parent = document.getElementById(parentId);

    if (child && parent) {
      child.disabled = !parent.checked;
      
      const container = child.closest('.setting-group');
      if (container) {
        container.style.opacity = parent.checked ? "1" : "0.5";
        container.style.pointerEvents = parent.checked ? "auto" : "none";
        container.style.cursor = parent.checked ? "auto" : "not-allowed";
      }
    }
  });
}

async function init() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  
  const keys = Array.from(checkboxes).map(cb => cb.id);
  const storage = await browser.storage.local.get(keys);

  checkboxes.forEach(cb => {
    cb.checked = storage[cb.id] ?? false;
    
    cb.addEventListener('change', async () => {
      updateUIStates();
      await saveAllSettings();
    });
  });

  updateUIStates();
}

document.addEventListener('DOMContentLoaded', init);
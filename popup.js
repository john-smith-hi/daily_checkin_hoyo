import { CONFIG } from './config.js';

// Main UI elements
const mainInterface = document.getElementById('main-interface');
const settingsInterface = document.getElementById('settings-interface');
const settingsBtn = document.getElementById('settings-btn');
const backBtn = document.getElementById('back-btn');
const checkinItems = document.querySelectorAll('.checkin-item');
const selectionCheckboxes = document.querySelectorAll('input[type="checkbox"]');

// Modal elements for cookie warning
const cookieModal = document.getElementById('cookie-modal');
const redirectUrl = document.getElementById('redirect_url');

// Initialize UI and event listeners on DOM ready
// Loads settings, sets up listeners, updates UI, and checks cookie
// This is the main entry point for the popup
//
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupEventListeners();
    updateInterface();
    checkCookieOnLoad();
    // Tự động check-in ngay khi mở popup
    chrome.runtime.sendMessage({ type: 'RUN_CHECKINS' });
});

/**
 * Set up all event listeners for UI and Chrome runtime messages
 */
function setupEventListeners() {
    settingsBtn.addEventListener('click', showSettings);
    backBtn.addEventListener('click', showMain);

    // Listen for changes in check-in selection checkboxes
    selectionCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            saveSettings();
            updateInterface();
        });
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request) => {
        if (request.type === 'COOKIE_CHECK_RESULT') {
            if (!request.cookieExists) showModal(); else hideModal();
        }
        if (request.type === 'CHECKIN_STATUS_UPDATE' && request.checkinStatus) {
            const s = request.checkinStatus;
            checkinItems.forEach(item => {
                const id = item.dataset.item;
                const icon = item.querySelector('.status-icon');
                setStatusIcon(icon, !!s[id]);
            });
        }
    });
}

/**
 * Show the settings interface and hide the main interface
 */
function showSettings() {
    mainInterface.classList.add('hidden');
    settingsInterface.classList.remove('hidden');
}

/**
 * Show the main interface and hide the settings interface
 */
function showMain() {
    settingsInterface.classList.add('hidden');
    mainInterface.classList.remove('hidden');
}

/**
 * Update the UI to show/hide check-in items based on enabled settings
 */
function updateInterface() {
    selectionCheckboxes.forEach(checkbox => {
        const itemId = checkbox.dataset.item;
        const isEnabled = checkbox.checked;
        const checkinItem = document.querySelector(`[data-item="${itemId}"]`);
        if (checkinItem) {
            if (isEnabled) checkinItem.classList.remove('hidden');
            else checkinItem.classList.add('hidden');
        }
    });
}

/**
 * Load enabled check-in items and their status from storage
 * Updates the UI checkboxes and status icons accordingly
 */
function loadSettings() {
    chrome.storage.sync.get(['enabledItems', 'checkinStatus'], function(result) {
        // Restore enabled/disabled state for each checkbox
        if (result.enabledItems) {
            selectionCheckboxes.forEach(checkbox => {
                const itemId = checkbox.dataset.item;
                checkbox.checked = result.enabledItems[itemId] !== false;
            });
        }

        // Restore check-in status icons
        if (result.checkinStatus) {
            checkinItems.forEach(item => {
                const itemId = item.dataset.item;
                const statusIcon = item.querySelector('.status-icon');
                const status = result.checkinStatus[itemId];
                setStatusIcon(statusIcon, !!status);
            });
        }
        // Update interface after loading settings
        updateInterface();
    });
}

/**
 * Save enabled/disabled state of check-in items to storage
 */
function saveSettings() {
    const enabledItems = {};
    selectionCheckboxes.forEach(checkbox => {
        const itemId = checkbox.dataset.item;
        enabledItems[itemId] = checkbox.checked;
    });
    chrome.storage.sync.set({ enabledItems: enabledItems });
}

/**
 * Set the status icon for a check-in item
 * @param {HTMLElement} statusIconEl - The icon element
 * @param {boolean} isSuccess - Whether check-in was successful
 */
function setStatusIcon(statusIconEl, isSuccess) {
    if (!statusIconEl) return;
    if (isSuccess) {
        statusIconEl.textContent = '✅';
        statusIconEl.classList.add('success');
        statusIconEl.classList.remove('failed');
    } else {
        statusIconEl.textContent = '❌';
        statusIconEl.classList.add('failed');
        statusIconEl.classList.remove('success');
    }
}

/**
 * Check for cookie existence on popup load and show modal if missing
 */
function checkCookieOnLoad() {
    chrome.runtime.sendMessage({ type: 'CHECK_COOKIE' }, (response) => {
        if (response && response.success) {
            if (!response.cookieExists) showModal();
        } else {
            console.log('CHECK_COOKIE response:', response);
        }
    });
}

/**
 * Extract the domain name from a URL for display
 * @param {string} url
 * @returns {string}
 */
function getDomainName(url) {
    try {
        const hostname = new URL(url).hostname;
        const parts = hostname.split('.');
        if (parts[0] === 'www') parts.shift();
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    } catch (e) {
        return url;
    }
}

/**
 * Show the modal dialog prompting user to login if cookie is missing
 */
function showModal() {
    try {
        redirectUrl.textContent = getDomainName(CONFIG.REDIRECT_URL);
        redirectUrl.href = CONFIG.REDIRECT_URL || '#';
    } catch (e) {
        redirectUrl.textContent = 'Open login page';
        redirectUrl.href = '#';
    }
    cookieModal.classList.remove('hidden');
}

/**
 * Hide the cookie warning modal
 */
function hideModal() {
    cookieModal.classList.add('hidden');
}
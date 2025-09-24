import { CONFIG } from './config.js';

/**
 * Promise wrapper for chrome.cookies.get
 * @param {Object} details - Cookie details
 * @returns {Promise<Object|null>} - Resolves with cookie object or null
 */
function getCookiePromise(details) {
    return new Promise((resolve) => {
        try {
            chrome.cookies.get(details, (cookie) => resolve(cookie || null));
        } catch (e) {
            console.error('getCookiePromise error', e);
            resolve(null);
        }
    });
}

/**
 * Promise wrapper for chrome.storage.sync.get
 * @param {string[]|string} keys - Keys to retrieve
 * @returns {Promise<Object>} - Resolves with items object
 */
function storageGet(keys) {
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.get(keys, (items) => resolve(items || {}));
        } catch (e) {
            console.error('storageGet error', e);
            resolve({});
        }
    });
}

/**
 * Promise wrapper for chrome.storage.sync.set
 * @param {Object} obj - Object to store
 * @returns {Promise<void>}
 */
function storageSet(obj) {
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.set(obj, () => resolve());
        } catch (e) {
            console.error('storageSet error', e);
            resolve();
        }
    });
}

/**
 * Retrieve a nested value from an object using a dot-separated path (e.g., 'a.b.c')
 * @param {Object} obj - Source object
 * @param {string} path - Dot-separated path
 * @returns {*} - Value at the path or undefined
 */
function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
        else return undefined;
    }
    return cur;
}

/**
 * Check if the required cookie exists
 * @returns {Promise<{exists: boolean, cookie?: Object, error?: string}>}
 */
async function checkCookieExists() {
    try {
        const cookie = await getCookiePromise({ url: CONFIG.CHECKIN_URL, name: CONFIG.COOKIE_NAME });
        return { exists: !!cookie, cookie: cookie };
    } catch (error) {
        console.error('Error checking cookies:', error);
        return { exists: false, error: String(error) };
    }
}

/**
 * Notify the popup about cookie existence
 * @param {boolean} cookieExists
 */
function notifyPopup(cookieExists) {
    try {
        chrome.runtime.sendMessage({ type: 'COOKIE_CHECK_RESULT', cookieExists }, () => {
            if (chrome.runtime.lastError) {
                // Popup may not be open, ignore error
                // console.log('notifyPopup failed', chrome.runtime.lastError);
            }
        });
    } catch (e) {
        // Popup may not be open
        // console.log('notifyPopup failed', e);
    }
}

// Safe sendMessage wrapper that swallows errors when no receiver exists
function safeSendMessage(message) {
    try {
        chrome.runtime.sendMessage(message, () => {
            if (chrome.runtime.lastError) {
                // Ignore: common when popup isn't open or no listener is registered
                // console.debug('safeSendMessage ignored error', chrome.runtime.lastError.message);
            }
        });
    } catch (e) {
        // In some environments sendMessage can throw; ignore to avoid uncaught rejection
        // console.debug('safeSendMessage threw', e);
    }
}

/**
 * Build configuration for each check-in item (1..4)
 * @param {string|number} itemId
 * @returns {Object} - Config object for the item
 */
function buildItemConfig(itemId) {
    switch (String(itemId)) {
        case '1':
            return {
                url: CONFIG.GENSHIN_IMPACT_URL_API_CHECKIN,
                method: CONFIG.GENSHIN_IMPACT_METHOD,
                actId: CONFIG.GENSHIN_IMPACT_ACT_ID,
                variableName: CONFIG.GENSHIN_IMPACT_VARIABLE_NAME,
                successValues: [CONFIG.GENSHIN_IMPACT_VARIABLE_VALUE_SUCCESS, CONFIG.GENSHIN_IMPACT_VARIABLE_VALUE_CHECKED].filter(v => v !== '')
            };
        case '2':
            return {
                url: CONFIG.HONKAI_STAR_RAIL_URL_API_CHECKIN,
                method: CONFIG.HONKAI_STAR_RAIL_METHOD,
                actId: CONFIG.HONKAI_STAR_RAIL_ACT_ID,
                variableName: CONFIG.HONKAI_STAR_RAIL_VARIABLE_NAME,
                successValues: [CONFIG.HONKAI_STAR_RAIL_VARIABLE_VALUE_SUCCESS, CONFIG.HONKAI_STAR_RAIL_VARIABLE_VALUE_CHECKED].filter(v => v !== '')
            };
        case '3':
            return {
                url: CONFIG.ZENDLESS_ZONE_ZERO_URL_API_CHECKIN,
                method: CONFIG.ZENDLESS_ZONE_ZERO_METHOD,
                actId: CONFIG.ZENDLESS_ZONE_ZERO_ACT_ID,
                variableName: CONFIG.ZENDLESS_ZONE_ZERO_VARIABLE_NAME,
                successValues: [CONFIG.ZENDLESS_ZONE_ZERO_VARIABLE_VALUE_SUCCESS, CONFIG.ZENDLESS_ZONE_ZERO_VARIABLE_VALUE_CHECKED].filter(v => v !== '')
            };
        case '4':
            return {
                url: CONFIG.HONKAI_IMPACT_URL_API_CHECKIN,
                method: CONFIG.HONKAI_IMPACT_METHOD,
                actId: CONFIG.HONKAI_IMPACT_ACT_ID,
                variableName: CONFIG.HONKAI_IMPACT_VARIABLE_NAME,
                successValues: [CONFIG.HONKAI_IMPACT_VARIABLE_VALUE_SUCCESS, CONFIG.HONKAI_IMPACT_VARIABLE_VALUE_CHECKED].filter(v => v !== '')
            };
        default:
            return { url: '', variableName: '', successValues: [] };
    }
}

/**
 * Perform check-in for all enabled items and update their status
 * Updates chrome.storage.sync with the new status
 */
async function performCheckins() {
    try {
        const stored = await storageGet(['enabledItems', 'checkinStatus']);
        const enabledItems = stored.enabledItems || {};
        const existingStatus = stored.checkinStatus || {};
        const newStatus = { ...existingStatus };

        for (let i = 1; i <= 4; i++) {
            const id = String(i);
            // If item is disabled in settings, set status to false
            if (enabledItems[id] === false) {
                newStatus[id] = false;
                continue;
            }

            const cfg = buildItemConfig(id);

            // If config is incomplete, keep previous status (or false)
            if (!cfg.url || !cfg.variableName || cfg.successValues.length === 0) {
                newStatus[id] = existingStatus[id] || false;
                continue;
            }

            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT_MS || 10000);
                // Build fetch options: only add Content-Type/body for POST
                const headers = {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json;charset=UTF-8',
                };
                const options = {
                    method: cfg.method,
                    credentials: 'include',
                    headers,
                    signal: controller.signal
                };
                if (String(cfg.method).toUpperCase() === 'POST' && cfg.actId) {
                    options.body = JSON.stringify({ act_id: cfg.actId });
                }

                // Debug: show which item is being attempted and whether it's enabled
                console.debug(`performCheckins: item=${id} method=${cfg.method} url=${cfg.url} actId=${cfg.actId}`);
                const resp = await fetch(cfg.url, options);
                clearTimeout(timeout);
                const data = await resp.json();
                console.log(`Check-in item ${id} response:`, data);

                // Get value from response, supports nested path
                let value = getNestedValue(data, cfg.variableName);
                if (typeof value === 'undefined') value = data[cfg.variableName];

                const matched = cfg.successValues.some(v => String(v) === String(value));
                newStatus[id] = !!matched;
                if (!matched) {
                    safeSendMessage({ type: 'CHECKIN_ERROR', errors: [`Check-in failed for item ${id}: unexpected value (${value})`] });
                }
            } catch (e) {
                let msg = `Error fetching/parsing API for item ${id}: ${e && e.name === 'AbortError' ? 'Timeout' : e}`;
                console.error(msg);
                safeSendMessage({ type: 'CHECKIN_ERROR', errors: [msg] });
                newStatus[id] = false;
            }
        }

        await storageSet({ checkinStatus: newStatus });

        // Notify popup to update immediately
        try {
            chrome.runtime.sendMessage({ type: 'CHECKIN_STATUS_UPDATE', checkinStatus: newStatus }, () => {
                if (chrome.runtime.lastError) {
                    // Popup may not be open, ignore error
                    // console.log('CHECKIN_STATUS_UPDATE failed', chrome.runtime.lastError);
                }
            });
        } catch (e) { /* ignore */ }

    } catch (e) {
        console.error('performCheckins error', e);
    }
}

/**
 * Check cookie and notify popup, then perform check-ins if cookie exists
 */
function performCheckAndNotify() {
    checkCookieExists().then(async (result) => {
        notifyPopup(result.exists);
        if (result.exists) {
            await performCheckins();
        }
    }).catch(e => {
        console.error('performCheckAndNotify error', e);
    });
}

// No alarm listeners: avoid periodic background checks

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'CHECK_COOKIE') {
        checkCookieExists().then(result => {
            const response = { success: true, cookieExists: result.exists, cookie: result.cookie };
            sendResponse(response);
            // Also send as a separate message for the listener in popup
            try {
                chrome.runtime.sendMessage({ 
                    type: 'COOKIE_CHECK_RESPONSE', 
                    success: true, 
                    cookieExists: result.exists, 
                    cookie: result.cookie 
                });
            } catch (e) {
                // Popup may not be open, ignore error
            }
        }).catch(error => {
            const response = { success: false, error: String(error) };
            sendResponse(response);
            // Also send as a separate message for the listener in popup
            try {
                chrome.runtime.sendMessage({ 
                    type: 'COOKIE_CHECK_RESPONSE', 
                    success: false, 
                    error: String(error) 
                });
            } catch (e) {
                // Popup may not be open, ignore error
            }
        });
        return true;
    }

    if (request.type === 'GET_CONFIG') {
        sendResponse({ success: true, config: CONFIG });
    }

    if (request.type === 'RUN_CHECKINS') {
        performCheckins().then(() => sendResponse({ success: true })).catch(() => sendResponse({ success: false }));
        return true;
    }
});

function init() {
    storageSet({ checkinStatus: { '1': false, '2': false, '3': false, '4': false } });
    // Run a single check when extension is installed or browser starts
    performCheckAndNotify();
}

// Initialize on install and startup
chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);
/**
 * Chameleon Background Service Worker
 * Manages extension lifecycle and coordinates profile generation
 */

// Extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
    console.log('[Chameleon Background] Extension installed/updated:', details.reason);
    
    // Set default settings on first install
    if (details.reason === 'install') {
        chrome.storage.local.set({
            enabled: true,
            autoRotate: false,
            rotateInterval: 3600000, // 1 hour in ms
            profileLock: false,
            debugMode: false
        });
    }
});

// Handle tab creation
chrome.tabs.onCreated.addListener(async (tab) => {
    // Generate new profile for new tab
    const profileId = generateProfileId();
    
    // Store in chrome.storage.session to persist across service worker restarts
    await chrome.storage.session.set({
        [`tab_${tab.id}`]: profileId
    });
    
    console.log(`[Chameleon Background] New profile ${profileId} for tab ${tab.id}`);
});

// Handle tab removal
chrome.tabs.onRemoved.addListener(async (tabId) => {
    // Clean up profile
    await chrome.storage.session.remove(`tab_${tabId}`);
    console.log(`[Chameleon Background] Removed profile for tab ${tabId}`);
});

// Handle navigation
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId === 0) { // Main frame only
        // Check if profile rotation is needed
        checkProfileRotation(details.tabId);
    }
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'getSettings':
            chrome.storage.local.get(null, (settings) => {
                sendResponse(settings);
            });
            return true;
            
        case 'updateSettings':
            chrome.storage.local.set(request.settings, () => {
                sendResponse({ success: true });
            });
            return true;
            
        case 'getTabProfile':
            chrome.storage.session.get(`tab_${sender.tab.id}`, (result) => {
                const profileId = result[`tab_${sender.tab.id}`];
                sendResponse({ profileId });
            });
            return true;
            
        case 'rotateProfile':
            rotateTabProfile(sender.tab.id).then(() => {
                sendResponse({ success: true });
            });
            return true;
            
        case 'getStats':
            getStatistics().then(stats => {
                sendResponse(stats);
            });
            return true;
            
        case 'exportProfiles':
            exportProfiles().then(data => {
                sendResponse(data);
            });
            return true;
    }
});

// Generate unique profile ID
function generateProfileId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Check if profile should be rotated
async function checkProfileRotation(tabId) {
    const settings = await chrome.storage.local.get(['autoRotate', 'rotateInterval', 'lastRotation']);
    
    if (settings.autoRotate) {
        const now = Date.now();
        const lastRotation = settings.lastRotation || 0;
        
        if (now - lastRotation > settings.rotateInterval) {
            await rotateTabProfile(tabId);
            await chrome.storage.local.set({ lastRotation: now });
        }
    }
}

// Rotate profile for a specific tab
async function rotateTabProfile(tabId) {
    const newProfileId = generateProfileId();
    
    // Store in session storage
    await chrome.storage.session.set({
        [`tab_${tabId}`]: newProfileId
    });
    
    // Notify content script to regenerate
    try {
        await chrome.tabs.sendMessage(tabId, {
            action: 'regenerateProfile'
        });
    } catch (err) {
        console.log('[Chameleon Background] Tab not ready for profile rotation');
    }
}

// Get statistics
async function getStatistics() {
    const stats = await chrome.storage.local.get(['statistics']);
    const currentStats = stats.statistics || {
        profilesGenerated: 0,
        sitesVisited: 0,
        fingerprintsBlocked: 0,
        startTime: Date.now()
    };
    
    // Get active tabs count from session storage
    const sessionData = await chrome.storage.session.get(null);
    const activeTabs = Object.keys(sessionData).filter(key => key.startsWith('tab_')).length;
    
    return {
        ...currentStats,
        uptime: Date.now() - currentStats.startTime,
        activeTabs
    };
}

// Export profiles data
async function exportProfiles() {
    const profiles = [];
    
    // Get all active profiles from session storage
    const sessionData = await chrome.storage.session.get(null);
    const tabIds = Object.keys(sessionData)
        .filter(key => key.startsWith('tab_'))
        .map(key => parseInt(key.replace('tab_', '')));
    
    for (const tabId of tabIds) {
        try {
            const tab = await chrome.tabs.get(tabId);
            profiles.push({
                tabId,
                profileId: sessionData[`tab_${tabId}`],
                url: tab.url,
                title: tab.title
            });
        } catch (e) {
            // Tab might have been closed
        }
    }
    
    return {
        timestamp: new Date().toISOString(),
        profiles,
        settings: await chrome.storage.local.get(null)
    };
}

// Update statistics
function updateStats(type) {
    chrome.storage.local.get(['statistics'], (result) => {
        const stats = result.statistics || {
            profilesGenerated: 0,
            sitesVisited: 0,
            fingerprintsBlocked: 0,
            startTime: Date.now()
        };
        
        if (type === 'profile') stats.profilesGenerated++;
        if (type === 'site') stats.sitesVisited++;
        if (type === 'fingerprint') stats.fingerprintsBlocked++;
        
        chrome.storage.local.set({ statistics: stats });
    });
}

// Context menu for quick actions
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'chameleon-rotate',
        title: 'Rotate Fingerprint',
        contexts: ['page']
    });
    
    chrome.contextMenus.create({
        id: 'chameleon-lock',
        title: 'Lock Current Profile',
        contexts: ['page']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'chameleon-rotate') {
        rotateTabProfile(tab.id);
        updateStats('profile');
    } else if (info.menuItemId === 'chameleon-lock') {
        chrome.storage.local.set({ profileLock: true });
    }
});

// Periodic cleanup
setInterval(async () => {
    // Clean up orphaned profiles
    const tabs = await chrome.tabs.query({});
    const activeTabIds = new Set(tabs.map(t => t.id));
    
    const sessionData = await chrome.storage.session.get(null);
    const storedTabKeys = Object.keys(sessionData).filter(key => key.startsWith('tab_'));
    
    for (const key of storedTabKeys) {
        const tabId = parseInt(key.replace('tab_', ''));
        if (!activeTabIds.has(tabId)) {
            await chrome.storage.session.remove(key);
        }
    }
}, 60000); // Every minute

console.log('[Chameleon Background] Service worker initialized');
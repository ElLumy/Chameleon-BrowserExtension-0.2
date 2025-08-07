/**
 * Popup Script
 * Handles the extension popup interface
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const elements = {
        statusIndicator: document.getElementById('statusIndicator'),
        statusText: document.getElementById('statusText'),
        toggleProtection: document.getElementById('toggleProtection'),
        profileName: document.getElementById('profileName'),
        profileOS: document.getElementById('profileOS'),
        profileBrowser: document.getElementById('profileBrowser'),
        sessionId: document.getElementById('sessionId'),
        rotateProfile: document.getElementById('rotateProfile'),
        autoRotate: document.getElementById('autoRotate'),
        debugMode: document.getElementById('debugMode'),
        profilesGenerated: document.getElementById('profilesGenerated'),
        fingerprintsBlocked: document.getElementById('fingerprintsBlocked'),
        sitesVisited: document.getElementById('sitesVisited'),
        uptime: document.getElementById('uptime'),
        exportData: document.getElementById('exportData'),
        detectionWarning: document.getElementById('detectionWarning')
    };

    // Load current settings
    async function loadSettings() {
        const settings = await chrome.storage.local.get([
            'enabled',
            'autoRotate',
            'debugMode'
        ]);

        // Update UI
        updateProtectionStatus(settings.enabled !== false);
        elements.autoRotate.checked = settings.autoRotate || false;
        elements.debugMode.checked = settings.debugMode || false;
    }

    // Update protection status UI
    function updateProtectionStatus(enabled) {
        if (enabled) {
            elements.statusIndicator.classList.remove('status-inactive');
            elements.statusIndicator.classList.add('status-active');
            elements.statusText.textContent = 'Protection Active';
            elements.toggleProtection.textContent = 'Disable';
            elements.toggleProtection.classList.remove('button-danger');
        } else {
            elements.statusIndicator.classList.remove('status-active');
            elements.statusIndicator.classList.add('status-inactive');
            elements.statusText.textContent = 'Protection Disabled';
            elements.toggleProtection.textContent = 'Enable';
            elements.toggleProtection.classList.add('button-danger');
        }
    }

    // Load profile information
    async function loadProfile() {
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Send message to content script with error handling
            chrome.tabs.sendMessage(tab.id, { action: 'getProfile' }, (response) => {
                // Check for errors
                if (chrome.runtime.lastError) {
                    console.error('Failed to get profile:', chrome.runtime.lastError);
                    elements.profileName.textContent = 'Not Available';
                    elements.profileOS.textContent = 'Not Available';
                    elements.profileBrowser.textContent = 'Not Available';
                    elements.sessionId.textContent = 'Not Available';
                    return;
                }
                
                if (response && response.profile) {
                    const profile = response.profile;
                    
                    // Update profile display
                    elements.profileName.textContent = profile.archetype || 'Unknown';
                    elements.profileOS.textContent = profile.os?.name || 'Unknown';
                    
                    // Extract browser from user agent
                    const ua = profile.userAgent || '';
                    let browser = 'Unknown';
                    if (ua.includes('Chrome')) browser = 'Chrome';
                    else if (ua.includes('Firefox')) browser = 'Firefox';
                    else if (ua.includes('Safari')) browser = 'Safari';
                    else if (ua.includes('Edge')) browser = 'Edge';
                    
                    elements.profileBrowser.textContent = browser;
                    elements.sessionId.textContent = profile.seed ? 
                        profile.seed.substring(0, 8) + '...' : 'N/A';
                } else {
                    elements.profileName.textContent = 'Not Available';
                    elements.profileOS.textContent = 'Not Available';
                    elements.profileBrowser.textContent = 'Not Available';
                    elements.sessionId.textContent = 'Not Available';
                }
            });
        } catch (error) {
            console.error('Failed to load profile:', error);
            elements.profileName.textContent = 'Not Available';
            elements.profileOS.textContent = 'Not Available';
            elements.profileBrowser.textContent = 'Not Available';
            elements.sessionId.textContent = 'Not Available';
        }
    }

    // Load statistics
    async function loadStatistics() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getStats' });
            
            if (response) {
                elements.profilesGenerated.textContent = response.profilesGenerated || 0;
                elements.fingerprintsBlocked.textContent = response.fingerprintsBlocked || 0;
                elements.sitesVisited.textContent = response.sitesVisited || 0;
                
                // Format uptime
                const uptime = response.uptime || 0;
                const hours = Math.floor(uptime / 3600000);
                const minutes = Math.floor((uptime % 3600000) / 60000);
                
                if (hours > 0) {
                    elements.uptime.textContent = `${hours}h ${minutes}m`;
                } else {
                    elements.uptime.textContent = `${minutes}m`;
                }
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    }

    // Check for fingerprinting detection
    async function checkDetection() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Send message to content script with error handling
            chrome.tabs.sendMessage(tab.id, { 
                action: 'getDetectionStatus' 
            }, (response) => {
                if (chrome.runtime.lastError) {
                    // Content script might not be loaded
                    elements.detectionWarning.classList.remove('active');
                    return;
                }
                
                if (response && response.isFingerprinting) {
                    elements.detectionWarning.classList.add('active');
                } else {
                    elements.detectionWarning.classList.remove('active');
                }
            });
        } catch (error) {
            // Content script might not be loaded
            elements.detectionWarning.classList.remove('active');
        }
    }

    // Event Listeners
    elements.toggleProtection.addEventListener('click', async () => {
        const settings = await chrome.storage.local.get(['enabled']);
        const newState = !(settings.enabled !== false);
        
        await chrome.storage.local.set({ enabled: newState });
        updateProtectionStatus(newState);
        
        // Reload current tab to apply changes
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.reload(tab.id);
    });

    elements.rotateProfile.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Send rotation request with error handling
            chrome.tabs.sendMessage(tab.id, { action: 'regenerateProfile' }, async (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Failed to rotate profile:', chrome.runtime.lastError);
                    elements.rotateProfile.textContent = '❌ Rotation Failed';
                    setTimeout(() => {
                        elements.rotateProfile.textContent = '🔄 Generate New Profile';
                    }, 2000);
                    return;
                }
                
                // Update statistics
                const stats = await chrome.storage.local.get(['statistics']);
                const currentStats = stats.statistics || {
                    profilesGenerated: 0,
                    sitesVisited: 0,
                    fingerprintsBlocked: 0,
                    startTime: Date.now()
                };
                
                currentStats.profilesGenerated++;
                await chrome.storage.local.set({ statistics: currentStats });
                
                // Reload profile display
                setTimeout(() => {
                    loadProfile();
                    loadStatistics();
                }, 500);
                
                // Visual feedback
                elements.rotateProfile.textContent = '✓ Profile Rotated!';
                setTimeout(() => {
                    elements.rotateProfile.textContent = '🔄 Generate New Profile';
                }, 2000);
            });
        } catch (error) {
            console.error('Failed to rotate profile:', error);
            elements.rotateProfile.textContent = '❌ Rotation Failed';
            setTimeout(() => {
                elements.rotateProfile.textContent = '🔄 Generate New Profile';
            }, 2000);
        }
    });

    elements.autoRotate.addEventListener('change', async (e) => {
        await chrome.storage.local.set({ autoRotate: e.target.checked });
        
        if (e.target.checked) {
            // Set rotation interval (1 hour default)
            await chrome.storage.local.set({ 
                rotateInterval: 3600000,
                lastRotation: Date.now()
            });
        }
    });

    elements.debugMode.addEventListener('change', async (e) => {
        await chrome.storage.local.set({ debugMode: e.target.checked });
        
        // Notify content scripts with error handling
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, { 
            action: 'setDebugMode', 
            enabled: e.target.checked 
        }, () => {
            // Ignore errors silently
            if (chrome.runtime.lastError) {
                console.log('Content script not ready');
            }
        });
    });

    elements.exportData.addEventListener('click', async () => {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'exportProfiles' });
            
            if (response) {
                // Create downloadable JSON
                const blob = new Blob([JSON.stringify(response, null, 2)], {
                    type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                
                // Trigger download
                const a = document.createElement('a');
                a.href = url;
                a.download = `chameleon-export-${Date.now()}.json`;
                a.click();
                
                URL.revokeObjectURL(url);
                
                // Visual feedback
                elements.exportData.textContent = '✓ Exported!';
                setTimeout(() => {
                    elements.exportData.textContent = '📥 Export Settings';
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to export data:', error);
            elements.exportData.textContent = '❌ Export Failed';
            setTimeout(() => {
                elements.exportData.textContent = '📥 Export Settings';
            }, 2000);
        }
    });

    // Initialize
    await loadSettings();
    await loadProfile();
    await loadStatistics();
    await checkDetection();

    // Refresh statistics periodically
    setInterval(() => {
        loadStatistics();
        checkDetection();
    }, 5000);
});
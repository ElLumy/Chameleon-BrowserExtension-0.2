/**
 * Chameleon Content Script
 * Main injection script that runs in ISOLATED world at document_start
 * Coordinates all interceptors and spoofing operations
 */

(async function() {
    'use strict';

    // Check if already injected
    if (window.__chameleon_injected) {
        return;
    }
    window.__chameleon_injected = true;

    console.log('[Chameleon] Initializing fingerprint spoofing...');

    // Load modules using ES6 imports instead of dynamic code execution
    async function loadModules() {
        const modules = [
            'seedManager.js',
            'spoofingEngine.js',
            'utils/randomUtils.js',
            'utils/jitterUtils.js',
            'interceptors/metaInterceptor.js',
            'interceptors/navigatorInterceptor.js',
            'interceptors/screenInterceptor.js',
            'interceptors/canvasInterceptor.js',
            'interceptors/webglInterceptor.js',
            'interceptors/audioInterceptor.js',
            'interceptors/fontsInterceptor.js',
            'interceptors/pluginsInterceptor.js',
            'interceptors/timezoneInterceptor.js'
        ];

        // Create a script element that loads modules properly
        const scriptContent = modules.map(module => {
            const url = chrome.runtime.getURL(module);
            return `import('${url}').then(m => window.${module.split('/').pop().replace('.js', '')} = m.default || m);`;
        }).join('\n');

        // Add initialization code
        const initCode = `
            // Wait for all modules to load
            Promise.all([
                ${modules.map(m => `import('${chrome.runtime.getURL(m)}')`).join(',\n                ')}
            ]).then(modules => {
                // Assign modules to window
                const moduleNames = ${JSON.stringify(modules.map(m => m.split('/').pop().replace('.js', '')))};
                modules.forEach((mod, i) => {
                    window[moduleNames[i]] = mod.default || mod;
                });

                // Initialize Chameleon
                initializeChameleon();
            }).catch(err => {
                console.error('[Chameleon] Failed to load modules:', err);
            });

            async function initializeChameleon() {
                try {
                    // First, install the meta-interceptor to prevent detection
                    if (window.MetaInterceptor) {
                        window.MetaInterceptor.init();
                    }
                    
                    // Initialize seed manager
                    if (!window.SeedManager) {
                        console.error('[Chameleon] SeedManager not loaded');
                        return;
                    }
                    
                    // Initialize spoofing engine
                    if (!window.SpoofingEngine) {
                        console.error('[Chameleon] SpoofingEngine not loaded');
                        return;
                    }
                    
                    // Generate or retrieve profile for this session
                    const profile = await window.SpoofingEngine.init();
                    console.log('[Chameleon] Profile generated:', profile.archetype);
                    
                    // Apply interceptors in order of priority
                    const interceptors = [
                        { name: 'Navigator', module: window.NavigatorInterceptor },
                        { name: 'Screen', module: window.ScreenInterceptor },
                        { name: 'Canvas', module: window.CanvasInterceptor },
                        { name: 'WebGL', module: window.WebGLInterceptor },
                        { name: 'Audio', module: window.AudioInterceptor },
                        { name: 'Fonts', module: window.FontsInterceptor },
                        { name: 'Plugins', module: window.PluginsInterceptor },
                        { name: 'Timezone', module: window.TimezoneInterceptor }
                    ];
                    
                    // Initialize each interceptor
                    for (const { name, module } of interceptors) {
                        if (module && typeof module.init === 'function') {
                            try {
                                module.init(profile);
                                console.log('[Chameleon]', name, 'interceptor initialized');
                            } catch (e) {
                                console.error('[Chameleon]', name, 'interceptor failed:', e);
                            }
                        } else {
                            console.warn('[Chameleon]', name, 'interceptor not available');
                        }
                    }
                    
                    // Add event listener for profile regeneration
                    window.addEventListener('chameleon-regenerate', async () => {
                        const newProfile = window.SpoofingEngine.regenerateProfile();
                        console.log('[Chameleon] Profile regenerated:', newProfile.archetype);
                        
                        // Reinitialize all interceptors with new profile
                        for (const { name, module } of interceptors) {
                            if (module && typeof module.init === 'function') {
                                try {
                                    module.init(newProfile);
                                } catch (e) {
                                    console.error('[Chameleon]', name, 'reinitialization failed:', e);
                                }
                            }
                        }
                    });
                    
                    console.log('[Chameleon] ✓ All interceptors initialized successfully');
                    
                    // Set flag indicating successful initialization
                    window.__chameleon_initialized = true;
                    
                    // Dispatch event to notify that Chameleon is ready
                    window.dispatchEvent(new CustomEvent('chameleon-ready', {
                        detail: { profile: profile }
                    }));
                    
                } catch (error) {
                    console.error('[Chameleon] Initialization failed:', error);
                    window.__chameleon_initialized = false;
                }
            }

            // Protect against fingerprinting detection
            const protectAPIs = () => {
                // Prevent enumeration of our added properties
                const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
                Object.getOwnPropertyNames = function(obj) {
                    const props = originalGetOwnPropertyNames.call(this, obj);
                    // Filter out our internal properties
                    return props.filter(prop => !prop.startsWith('__chameleon'));
                };
                
                // Prevent detection via error stack traces
                const originalError = Error;
                window.Error = new Proxy(originalError, {
                    construct(target, args) {
                        const error = new target(...args);
                        if (error.stack) {
                            // Clean stack traces of our injected code
                            error.stack = error.stack
                                .split('\\n')
                                .filter(line => !line.includes('chameleon'))
                                .join('\\n');
                        }
                        return error;
                    }
                });
            };
            
            protectAPIs();
        `;

        // Create and inject the script
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = initCode;

        // Inject the script as early as possible
        if (document.documentElement) {
            document.documentElement.appendChild(script);
            script.remove();
        } else {
            // If documentElement doesn't exist yet, wait for it
            const observer = new MutationObserver((mutations, obs) => {
                if (document.documentElement) {
                    document.documentElement.appendChild(script);
                    script.remove();
                    obs.disconnect();
                }
            });
            observer.observe(document, { childList: true, subtree: true });
        }
    }

    // Load modules
    await loadModules();

    // Listen for messages from the extension popup or background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getProfile') {
            // Get current profile
            window.dispatchEvent(new CustomEvent('chameleon-get-profile'));
            
            // Listen for response
            window.addEventListener('chameleon-profile-data', (event) => {
                sendResponse({ profile: event.detail });
            }, { once: true });
            
            return true; // Keep message channel open
        } else if (request.action === 'regenerateProfile') {
            // Trigger profile regeneration
            window.dispatchEvent(new CustomEvent('chameleon-regenerate'));
            sendResponse({ success: true });
        } else if (request.action === 'getStatus') {
            // Check if Chameleon is initialized
            sendResponse({ 
                initialized: window.__chameleon_initialized || false 
            });
        }
    });

})();
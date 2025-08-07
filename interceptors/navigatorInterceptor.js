/**
 * Navigator Interceptor
 * Intercepts and spoofs navigator properties based on the generated profile
 */

(function() {
    'use strict';

    const NavigatorInterceptor = {
        // Store original values
        originals: {},
        
        // Properties to spoof
        spoofableProperties: [
            'userAgent',
            'platform',
            'hardwareConcurrency',
            'deviceMemory',
            'language',
            'languages',
            'vendor',
            'appVersion',
            'maxTouchPoints',
            'plugins',
            'mimeTypes'
        ],

        init(profile) {
            this.storeOriginals();
            this.applyProfile(profile);
            this.interceptGetters();
        },

        storeOriginals() {
            this.spoofableProperties.forEach(prop => {
                if (prop in navigator) {
                    const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, prop) ||
                                     Object.getOwnPropertyDescriptor(navigator, prop);
                    if (descriptor) {
                        this.originals[prop] = descriptor;
                    }
                }
            });
        },

        applyProfile(profile) {
            const nav = profile.navigator || {};
            
            // Define spoofed values
            this.spoofedValues = {
                userAgent: nav.userAgent || navigator.userAgent,
                platform: nav.platform || navigator.platform,
                hardwareConcurrency: nav.hardwareConcurrency || navigator.hardwareConcurrency,
                deviceMemory: nav.deviceMemory || navigator.deviceMemory,
                language: nav.language || navigator.language,
                languages: nav.languages || navigator.languages,
                vendor: nav.vendor || navigator.vendor,
                appVersion: nav.appVersion || navigator.appVersion,
                maxTouchPoints: nav.maxTouchPoints || 0,
                plugins: nav.plugins || [],
                mimeTypes: nav.mimeTypes || []
            };

            // Apply OS-specific logic
            this.applyOSSpecificTweaks(profile);
        },

        applyOSSpecificTweaks(profile) {
            const os = profile.os || {};
            
            // Ensure consistency between platform and userAgent
            if (os.name === 'Windows 11' || os.name === 'Windows 10') {
                this.spoofedValues.platform = 'Win32';
                this.spoofedValues.vendor = 'Google Inc.';
            } else if (os.name && os.name.includes('macOS')) {
                this.spoofedValues.platform = 'MacIntel';
                this.spoofedValues.vendor = 'Apple Computer, Inc.';
            } else if (os.name && os.name.includes('Linux')) {
                this.spoofedValues.platform = 'Linux x86_64';
                this.spoofedValues.vendor = 'Google Inc.';
            }
        },

        interceptGetters() {
            // Use Object.defineProperty for simple properties
            ['userAgent', 'platform', 'vendor', 'appVersion', 'language'].forEach(prop => {
                this.definePropertyInterceptor(prop);
            });

            // Use special handling for complex properties
            this.interceptHardwareConcurrency();
            this.interceptDeviceMemory();
            this.interceptLanguages();
            this.interceptMaxTouchPoints();
        },

        definePropertyInterceptor(prop) {
            const value = this.spoofedValues[prop];
            
            try {
                Object.defineProperty(Navigator.prototype, prop, {
                    get: function() {
                        return value;
                    },
                    configurable: true,
                    enumerable: true
                });
            } catch (e) {
                // Fallback to direct assignment if prototype modification fails
                Object.defineProperty(navigator, prop, {
                    value: value,
                    writable: false,
                    configurable: true,
                    enumerable: true
                });
            }
        },

        interceptHardwareConcurrency() {
            const value = this.spoofedValues.hardwareConcurrency;
            
            Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
                get: function() {
                    return value;
                },
                configurable: true,
                enumerable: true
            });
        },

        interceptDeviceMemory() {
            const value = this.spoofedValues.deviceMemory;
            
            if ('deviceMemory' in navigator) {
                Object.defineProperty(Navigator.prototype, 'deviceMemory', {
                    get: function() {
                        return value;
                    },
                    configurable: true,
                    enumerable: true
                });
            }
        },

        interceptLanguages() {
            const languages = this.spoofedValues.languages;
            
            Object.defineProperty(Navigator.prototype, 'languages', {
                get: function() {
                    return Object.freeze([...languages]);
                },
                configurable: true,
                enumerable: true
            });
        },

        interceptMaxTouchPoints() {
            const value = this.spoofedValues.maxTouchPoints;
            
            Object.defineProperty(Navigator.prototype, 'maxTouchPoints', {
                get: function() {
                    return value;
                },
                configurable: true,
                enumerable: true
            });
        },

        // Method to restore original values (for debugging)
        restore() {
            Object.keys(this.originals).forEach(prop => {
                const original = this.originals[prop];
                if (original.get) {
                    Object.defineProperty(Navigator.prototype, prop, original);
                } else {
                    Object.defineProperty(navigator, prop, original);
                }
            });
        }
    };

    // Export for use in other modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = NavigatorInterceptor;
    } else {
        window.NavigatorInterceptor = NavigatorInterceptor;
    }
})();
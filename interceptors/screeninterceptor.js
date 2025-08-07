/**
 * Screen Interceptor
 * Spoofs screen dimensions and color depth based on profile
 * FIXED: Added proper error handling and configurable property checks
 */

(function() {
    'use strict';

    const ScreenInterceptor = {
        profile: null,
        screenValues: {},
        originalDescriptors: new Map(),
        intercepted: false,
        
        init(profile) {
            // Don't re-initialize if already intercepted
            if (this.intercepted) {
                this.restore();
            }
            
            this.profile = profile;
            this.calculateScreenValues(profile);
            this.storeOriginals();
            this.interceptScreen();
            this.interceptWindow();
            this.intercepted = true;
        },

        storeOriginals() {
            // Store original screen property descriptors
            const screenProps = [
                'width', 'height', 'availWidth', 'availHeight',
                'colorDepth', 'pixelDepth', 'availLeft', 'availTop', 'orientation'
            ];
            
            screenProps.forEach(prop => {
                if (prop in Screen.prototype) {
                    const descriptor = Object.getOwnPropertyDescriptor(Screen.prototype, prop);
                    if (descriptor) {
                        this.originalDescriptors.set(`Screen.${prop}`, descriptor);
                    }
                } else if (prop in screen) {
                    const descriptor = Object.getOwnPropertyDescriptor(screen, prop);
                    if (descriptor) {
                        this.originalDescriptors.set(`screen.${prop}`, descriptor);
                    }
                }
            });
            
            // Store original window property descriptors
            const windowProps = ['devicePixelRatio', 'innerWidth', 'innerHeight', 'outerWidth', 'outerHeight'];
            windowProps.forEach(prop => {
                const descriptor = Object.getOwnPropertyDescriptor(window, prop);
                if (descriptor) {
                    this.originalDescriptors.set(`window.${prop}`, descriptor);
                }
            });
            
            // Store matchMedia
            this.originalDescriptors.set('window.matchMedia', window.matchMedia);
        },

        calculateScreenValues(profile) {
            const display = profile.display || {};
            const resolution = display.resolution || '1920x1080';
            const [width, height] = resolution.split('x').map(Number);
            
            // Calculate realistic values
            this.screenValues = {
                width: width,
                height: height,
                availWidth: width,
                availHeight: height - this.getTaskbarHeight(profile.os?.name),
                colorDepth: display.colorDepth || 24,
                pixelDepth: display.pixelDepth || 24,
                availLeft: 0,
                availTop: 0,
                orientation: {
                    angle: 0,
                    type: width > height ? 'landscape-primary' : 'portrait-primary'
                }
            };
            
            // Add devicePixelRatio
            this.screenValues.devicePixelRatio = this.calculatePixelRatio(profile);
        },

        getTaskbarHeight(osName) {
            // Simulate taskbar height based on OS
            if (!osName) return 40;
            
            if (osName.includes('Windows')) {
                return 40; // Windows taskbar
            } else if (osName.includes('macOS')) {
                return 23; // macOS menu bar
            } else if (osName.includes('Linux')) {
                return 27; // Typical Linux panel
            }
            
            return 40;
        },

        calculatePixelRatio(profile) {
            const display = profile.display || {};
            const resolution = display.resolution || '1920x1080';
            
            // High DPI displays
            if (resolution.includes('2560') || resolution.includes('3840') || resolution.includes('2880')) {
                return 2;
            }
            
            // Retina displays for Mac
            if (profile.os?.name?.includes('macOS') && resolution.includes('2880')) {
                return 2;
            }
            
            return 1;
        },

        interceptScreen() {
            const self = this;
            
            // Screen properties to intercept
            const properties = [
                'width', 'height', 'availWidth', 'availHeight',
                'colorDepth', 'pixelDepth', 'availLeft', 'availTop'
            ];
            
            properties.forEach(prop => {
                try {
                    // Check if property is configurable
                    const descriptor = Object.getOwnPropertyDescriptor(Screen.prototype, prop) ||
                                     Object.getOwnPropertyDescriptor(screen, prop);
                    
                    if (descriptor && descriptor.configurable === false) {
                        console.warn(`[Chameleon] Cannot intercept non-configurable property: Screen.${prop}`);
                        return;
                    }
                    
                    // Try to define on prototype first
                    if (Screen.prototype.hasOwnProperty(prop) || prop in Screen.prototype) {
                        Object.defineProperty(Screen.prototype, prop, {
                            get: function() {
                                return self.screenValues[prop];
                            },
                            configurable: true,
                            enumerable: true
                        });
                    } else {
                        // Fallback to screen object
                        Object.defineProperty(screen, prop, {
                            get: function() {
                                return self.screenValues[prop];
                            },
                            configurable: true,
                            enumerable: true
                        });
                    }
                } catch (e) {
                    console.warn(`[Chameleon] Failed to intercept Screen.${prop}:`, e.message);
                }
            });
            
            // Intercept orientation with proper checks
            if ('orientation' in screen) {
                try {
                    const orientationDescriptor = Object.getOwnPropertyDescriptor(Screen.prototype, 'orientation') ||
                                                 Object.getOwnPropertyDescriptor(screen, 'orientation');
                    
                    if (!orientationDescriptor || orientationDescriptor.configurable !== false) {
                        Object.defineProperty(Screen.prototype, 'orientation', {
                            get: function() {
                                return self.screenValues.orientation;
                            },
                            configurable: true,
                            enumerable: true
                        });
                    }
                } catch (e) {
                    console.warn('[Chameleon] Failed to intercept orientation:', e.message);
                }
            }
        },

        interceptWindow() {
            const self = this;
            
            // Window properties related to screen
            try {
                const dprDescriptor = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
                if (!dprDescriptor || dprDescriptor.configurable !== false) {
                    Object.defineProperty(window, 'devicePixelRatio', {
                        get: function() {
                            return self.screenValues.devicePixelRatio;
                        },
                        configurable: true,
                        enumerable: true
                    });
                }
            } catch (e) {
                console.warn('[Chameleon] Failed to intercept devicePixelRatio:', e.message);
            }
            
            // Intercept innerWidth/innerHeight with bounds checking
            const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
            const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
            
            try {
                if (!originalInnerWidth || originalInnerWidth.configurable !== false) {
                    Object.defineProperty(window, 'innerWidth', {
                        get: function() {
                            const original = originalInnerWidth ? originalInnerWidth.get.call(this) : window.innerWidth;
                            // Ensure it doesn't exceed screen width
                            return Math.min(original, self.screenValues.width);
                        },
                        configurable: true,
                        enumerable: true
                    });
                }
            } catch (e) {
                console.warn('[Chameleon] Failed to intercept innerWidth:', e.message);
            }
            
            try {
                if (!originalInnerHeight || originalInnerHeight.configurable !== false) {
                    Object.defineProperty(window, 'innerHeight', {
                        get: function() {
                            const original = originalInnerHeight ? originalInnerHeight.get.call(this) : window.innerHeight;
                            // Ensure it doesn't exceed available height
                            return Math.min(original, self.screenValues.availHeight);
                        },
                        configurable: true,
                        enumerable: true
                    });
                }
            } catch (e) {
                console.warn('[Chameleon] Failed to intercept innerHeight:', e.message);
            }
            
            // Intercept outerWidth/outerHeight
            try {
                Object.defineProperty(window, 'outerWidth', {
                    get: function() {
                        return self.screenValues.width;
                    },
                    configurable: true,
                    enumerable: true
                });
                
                Object.defineProperty(window, 'outerHeight', {
                    get: function() {
                        return self.screenValues.height;
                    },
                    configurable: true,
                    enumerable: true
                });
            } catch (e) {
                console.warn('[Chameleon] Failed to intercept outer dimensions:', e.message);
            }
            
            // Intercept screen methods
            this.interceptMatchMedia();
        },

        interceptMatchMedia() {
            const original = window.matchMedia;
            const self = this;
            
            try {
                window.matchMedia = new Proxy(original, {
                    apply(target, thisArg, args) {
                        let query = args[0];
                        
                        // Modify query based on our screen values
                        query = self.modifyMediaQuery(query);
                        
                        return Reflect.apply(target, thisArg, [query]);
                    }
                });
                
                this.maskAsNative(window.matchMedia, 'matchMedia');
            } catch (e) {
                console.warn('[Chameleon] Failed to intercept matchMedia:', e.message);
            }
        },

        modifyMediaQuery(query) {
            const self = this;
            
            // Replace screen dimension queries with our values
            query = query.replace(/\(max-width:\s*(\d+)px\)/g, (match, width) => {
                const maxWidth = Math.min(parseInt(width), self.screenValues.width);
                return `(max-width: ${maxWidth}px)`;
            });
            
            query = query.replace(/\(min-width:\s*(\d+)px\)/g, (match, width) => {
                const minWidth = Math.min(parseInt(width), self.screenValues.width);
                return `(min-width: ${minWidth}px)`;
            });
            
            query = query.replace(/\(max-height:\s*(\d+)px\)/g, (match, height) => {
                const maxHeight = Math.min(parseInt(height), self.screenValues.height);
                return `(max-height: ${maxHeight}px)`;
            });
            
            query = query.replace(/\(min-height:\s*(\d+)px\)/g, (match, height) => {
                const minHeight = Math.min(parseInt(height), self.screenValues.height);
                return `(min-height: ${minHeight}px)`;
            });
            
            // Handle device pixel ratio queries
            if (query.includes('device-pixel-ratio')) {
                query = query.replace(/\(-webkit-min-device-pixel-ratio:\s*([\d.]+)\)/g, 
                    `(-webkit-min-device-pixel-ratio: ${self.screenValues.devicePixelRatio})`);
                query = query.replace(/\(min-resolution:\s*([\d.]+)dppx\)/g, 
                    `(min-resolution: ${self.screenValues.devicePixelRatio}dppx)`);
            }
            
            return query;
        },

        maskAsNative(func, name) {
            try {
                func.toString = function() {
                    return `function ${name}() { [native code] }`;
                };
            } catch (e) {
                // Some functions may not allow toString override
            }
        },

        restore() {
            // Restore original descriptors
            this.originalDescriptors.forEach((descriptor, key) => {
                const [obj, prop] = key.split('.');
                
                try {
                    if (obj === 'Screen') {
                        Object.defineProperty(Screen.prototype, prop, descriptor);
                    } else if (obj === 'screen') {
                        Object.defineProperty(screen, prop, descriptor);
                    } else if (obj === 'window' && prop === 'matchMedia') {
                        window.matchMedia = descriptor;
                    } else if (obj === 'window') {
                        Object.defineProperty(window, prop, descriptor);
                    }
                } catch (e) {
                    console.warn(`[Chameleon] Failed to restore ${key}:`, e.message);
                }
            });
            
            this.intercepted = false;
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ScreenInterceptor;
    } else {
        window.ScreenInterceptor = ScreenInterceptor;
    }
})();
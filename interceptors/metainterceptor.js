/**
 * Meta Interceptor
 * The ultimate defense against fingerprinting detection
 * Intercepts Function.prototype.toString to hide all modifications
 */

(function() {
    'use strict';

    const MetaInterceptor = {
        interceptedFunctions: new WeakSet(),
        originalToString: Function.prototype.toString,
        
        init() {
            this.interceptToString();
            this.interceptProxy();
            this.protectWeakSets();
        },

        interceptToString() {
            const self = this;
            const original = this.originalToString;
            
            // Store native function signatures
            const nativeFunctions = new Map([
                // Navigator
                ['hardwareConcurrency', 'function get hardwareConcurrency() { [native code] }'],
                ['deviceMemory', 'function get deviceMemory() { [native code] }'],
                ['platform', 'function get platform() { [native code] }'],
                ['userAgent', 'function get userAgent() { [native code] }'],
                ['vendor', 'function get vendor() { [native code] }'],
                ['language', 'function get language() { [native code] }'],
                ['languages', 'function get languages() { [native code] }'],
                ['plugins', 'function get plugins() { [native code] }'],
                ['maxTouchPoints', 'function get maxTouchPoints() { [native code] }'],
                
                // Canvas
                ['toDataURL', 'function toDataURL() { [native code] }'],
                ['toBlob', 'function toBlob() { [native code] }'],
                ['getImageData', 'function getImageData() { [native code] }'],
                ['getContext', 'function getContext() { [native code] }'],
                
                // WebGL
                ['getParameter', 'function getParameter() { [native code] }'],
                ['getExtension', 'function getExtension() { [native code] }'],
                ['getSupportedExtensions', 'function getSupportedExtensions() { [native code] }'],
                
                // Audio
                ['createAnalyser', 'function createAnalyser() { [native code] }'],
                ['createOscillator', 'function createOscillator() { [native code] }'],
                ['getFloatFrequencyData', 'function getFloatFrequencyData() { [native code] }'],
                
                // Screen
                ['width', 'function get width() { [native code] }'],
                ['height', 'function get height() { [native code] }'],
                ['availWidth', 'function get availWidth() { [native code] }'],
                ['availHeight', 'function get availHeight() { [native code] }'],
                ['colorDepth', 'function get colorDepth() { [native code] }'],
                ['pixelDepth', 'function get pixelDepth() { [native code] }'],
                
                // Window
                ['innerWidth', 'function get innerWidth() { [native code] }'],
                ['innerHeight', 'function get innerHeight() { [native code] }'],
                ['outerWidth', 'function get outerWidth() { [native code] }'],
                ['outerHeight', 'function get outerHeight() { [native code] }'],
                ['devicePixelRatio', 'function get devicePixelRatio() { [native code] }'],
                ['matchMedia', 'function matchMedia() { [native code] }'],
                
                // Other
                ['getComputedStyle', 'function getComputedStyle() { [native code] }'],
                ['getBattery', 'function getBattery() { [native code] }'],
                ['requestAnimationFrame', 'function requestAnimationFrame() { [native code] }'],
                ['setTimeout', 'function setTimeout() { [native code] }'],
                ['setInterval', 'function setInterval() { [native code] }']
            ]);

            // Override Function.prototype.toString
            Function.prototype.toString = new Proxy(original, {
                apply(target, thisArg, args) {
                    // Check if this function is one we've intercepted
                    if (self.interceptedFunctions.has(thisArg)) {
                        // Get the function name
                        const name = thisArg.name || self.getFunctionName(thisArg);
                        
                        // Return native signature if we have it
                        if (nativeFunctions.has(name)) {
                            return nativeFunctions.get(name);
                        }
                        
                        // Generic native code response
                        return `function ${name}() { [native code] }`;
                    }
                    
                    // Check for property descriptors
                    const descriptor = self.findPropertyDescriptor(thisArg);
                    if (descriptor) {
                        const name = descriptor.name;
                        if (nativeFunctions.has(name)) {
                            return nativeFunctions.get(name);
                        }
                    }
                    
                    // Call original toString for non-intercepted functions
                    return Reflect.apply(target, thisArg, args);
                }
            });

            // Mark toString itself as native
            this.interceptedFunctions.add(Function.prototype.toString);
        },

        interceptProxy() {
            const self = this;
            const OriginalProxy = window.Proxy;
            
            // Track all created proxies
            const proxies = new WeakSet();
            
            window.Proxy = new Proxy(OriginalProxy, {
                construct(target, args) {
                    const proxy = new target(...args);
                    
                    // Track this proxy
                    proxies.add(proxy);
                    
                    // If this is a function proxy, mark it as intercepted
                    if (typeof args[0] === 'function') {
                        self.interceptedFunctions.add(proxy);
                    }
                    
                    return proxy;
                }
            });
            
            // Preserve Proxy properties
            Object.setPrototypeOf(window.Proxy, OriginalProxy);
            window.Proxy.revocable = OriginalProxy.revocable;
        },

        protectWeakSets() {
            // Prevent external code from checking our WeakSets
            const originalWeakSetHas = WeakSet.prototype.has;
            const self = this;
            
            WeakSet.prototype.has = new Proxy(originalWeakSetHas, {
                apply(target, thisArg, args) {
                    // If checking our internal WeakSet, always return false
                    if (thisArg === self.interceptedFunctions) {
                        return false;
                    }
                    return Reflect.apply(target, thisArg, args);
                }
            });
        },

        getFunctionName(func) {
            // Try to extract function name
            const match = func.toString().match(/function\s+([^\s(]+)/);
            return match ? match[1] : 'anonymous';
        },

        findPropertyDescriptor(func) {
            // Search for property descriptor that matches this function
            const objects = [
                Navigator.prototype,
                Screen.prototype,
                HTMLCanvasElement.prototype,
                CanvasRenderingContext2D.prototype,
                WebGLRenderingContext.prototype,
                AudioContext.prototype,
                AnalyserNode.prototype,
                Window.prototype,
                Document.prototype
            ];
            
            for (const obj of objects) {
                const props = Object.getOwnPropertyNames(obj);
                for (const prop of props) {
                    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
                    if (descriptor && (descriptor.get === func || descriptor.set === func || descriptor.value === func)) {
                        return { name: prop, descriptor };
                    }
                }
            }
            
            return null;
        },

        // Mark a function as intercepted
        markAsIntercepted(func) {
            this.interceptedFunctions.add(func);
        },

        // Helper to create native-looking functions
        createNativeFunction(name, implementation) {
            const func = new Proxy(implementation, {
                apply(target, thisArg, args) {
                    return Reflect.apply(target, thisArg, args);
                }
            });
            
            // Mark as intercepted so toString returns native code
            this.markAsIntercepted(func);
            
            // Set the name property
            Object.defineProperty(func, 'name', {
                value: name,
                configurable: true
            });
            
            return func;
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MetaInterceptor;
    } else {
        window.MetaInterceptor = MetaInterceptor;
    }
})();
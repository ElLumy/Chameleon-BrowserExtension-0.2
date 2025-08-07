/**
 * Plugins Interceptor
 * Controls the plugins and mimeTypes arrays based on profile
 */

(function() {
    'use strict';

    const PluginsInterceptor = {
        profile: null,
        plugins: [],
        mimeTypes: [],
        
        init(profile) {
            this.profile = profile;
            this.createPlugins(profile);
            this.interceptNavigatorPlugins();
            this.interceptNavigatorMimeTypes();
        },

        createPlugins(profile) {
            const os = profile.os?.name || '';
            
            // Define plugins based on OS and browser
            if (os.includes('Windows') || os.includes('macOS') || os.includes('Linux')) {
                // Chrome default plugins
                this.plugins = [
                    {
                        name: 'PDF Viewer',
                        filename: 'internal-pdf-viewer',
                        description: 'Portable Document Format',
                        mimeTypes: [
                            {
                                type: 'application/pdf',
                                suffixes: 'pdf',
                                description: 'Portable Document Format'
                            },
                            {
                                type: 'text/pdf',
                                suffixes: 'pdf',
                                description: 'Portable Document Format'
                            }
                        ]
                    },
                    {
                        name: 'Chrome PDF Viewer',
                        filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                        description: 'Portable Document Format',
                        mimeTypes: [
                            {
                                type: 'application/pdf',
                                suffixes: 'pdf',
                                description: 'Portable Document Format'
                            }
                        ]
                    },
                    {
                        name: 'Chromium PDF Plugin',
                        filename: 'internal-pdf-viewer',
                        description: 'Portable Document Format',
                        mimeTypes: [
                            {
                                type: 'application/x-google-chrome-pdf',
                                suffixes: 'pdf',
                                description: 'Portable Document Format'
                            }
                        ]
                    },
                    {
                        name: 'Microsoft Edge PDF Viewer',
                        filename: 'internal-pdf-viewer',
                        description: 'Portable Document Format',
                        mimeTypes: [
                            {
                                type: 'application/pdf',
                                suffixes: 'pdf',
                                description: 'Portable Document Format'
                            }
                        ]
                    },
                    {
                        name: 'WebKit built-in PDF',
                        filename: 'internal-pdf-viewer',
                        description: 'Portable Document Format',
                        mimeTypes: [
                            {
                                type: 'application/pdf',
                                suffixes: 'pdf',
                                description: 'Portable Document Format'
                            }
                        ]
                    }
                ];
                
                // Collect all mimeTypes
                this.mimeTypes = [];
                this.plugins.forEach(plugin => {
                    plugin.mimeTypes.forEach(mimeType => {
                        // Check if already exists
                        if (!this.mimeTypes.find(m => m.type === mimeType.type)) {
                            this.mimeTypes.push({
                                ...mimeType,
                                enabledPlugin: plugin
                            });
                        }
                    });
                });
            } else {
                // Mobile or unknown - no plugins
                this.plugins = [];
                this.mimeTypes = [];
            }
        },

        interceptNavigatorPlugins() {
            const self = this;
            
            // Create custom PluginArray
            const PluginArray = function() {
                const arr = [...self.plugins];
                
                // Add named properties
                self.plugins.forEach((plugin, index) => {
                    arr[plugin.name] = plugin;
                });
                
                // Add required methods
                arr.item = function(index) {
                    return self.plugins[index] || null;
                };
                
                arr.namedItem = function(name) {
                    return self.plugins.find(p => p.name === name) || null;
                };
                
                arr.refresh = function() {
                    // No-op in modern browsers
                };
                
                // Set length
                Object.defineProperty(arr, 'length', {
                    get: function() {
                        return self.plugins.length;
                    },
                    enumerable: false,
                    configurable: true
                });
                
                return arr;
            };
            
            // Create plugins array
            const pluginsArray = new PluginArray();
            
            // Override navigator.plugins
            Object.defineProperty(Navigator.prototype, 'plugins', {
                get: function() {
                    return pluginsArray;
                },
                configurable: true,
                enumerable: true
            });
            
            // Create Plugin objects
            self.plugins = self.plugins.map(pluginData => {
                const plugin = Object.create(Plugin.prototype);
                
                Object.defineProperties(plugin, {
                    name: {
                        value: pluginData.name,
                        enumerable: true
                    },
                    filename: {
                        value: pluginData.filename,
                        enumerable: true
                    },
                    description: {
                        value: pluginData.description,
                        enumerable: true
                    },
                    length: {
                        get: function() {
                            return pluginData.mimeTypes.length;
                        },
                        enumerable: true
                    }
                });
                
                // Add mimeTypes as indexed properties
                pluginData.mimeTypes.forEach((mimeType, index) => {
                    plugin[index] = mimeType;
                });
                
                // Add methods
                plugin.item = function(index) {
                    return pluginData.mimeTypes[index] || null;
                };
                
                plugin.namedItem = function(type) {
                    return pluginData.mimeTypes.find(m => m.type === type) || null;
                };
                
                return plugin;
            });
        },

        interceptNavigatorMimeTypes() {
            const self = this;
            
            // Create custom MimeTypeArray
            const MimeTypeArray = function() {
                const arr = [...self.mimeTypes];
                
                // Add named properties
                self.mimeTypes.forEach(mimeType => {
                    arr[mimeType.type] = mimeType;
                });
                
                // Add required methods
                arr.item = function(index) {
                    return self.mimeTypes[index] || null;
                };
                
                arr.namedItem = function(type) {
                    return self.mimeTypes.find(m => m.type === type) || null;
                };
                
                // Set length
                Object.defineProperty(arr, 'length', {
                    get: function() {
                        return self.mimeTypes.length;
                    },
                    enumerable: false,
                    configurable: true
                });
                
                return arr;
            };
            
            // Create mimeTypes array
            const mimeTypesArray = new MimeTypeArray();
            
            // Override navigator.mimeTypes
            Object.defineProperty(Navigator.prototype, 'mimeTypes', {
                get: function() {
                    return mimeTypesArray;
                },
                configurable: true,
                enumerable: true
            });
            
            // Create MimeType objects
            self.mimeTypes = self.mimeTypes.map(mimeTypeData => {
                const mimeType = Object.create(MimeType.prototype);
                
                Object.defineProperties(mimeType, {
                    type: {
                        value: mimeTypeData.type,
                        enumerable: true
                    },
                    suffixes: {
                        value: mimeTypeData.suffixes,
                        enumerable: true
                    },
                    description: {
                        value: mimeTypeData.description,
                        enumerable: true
                    },
                    enabledPlugin: {
                        value: mimeTypeData.enabledPlugin,
                        enumerable: true
                    }
                });
                
                return mimeType;
            });
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PluginsInterceptor;
    } else {
        window.PluginsInterceptor = PluginsInterceptor;
    }
})();
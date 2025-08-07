/**
 * Audio Interceptor
 * Adds deterministic noise to audio fingerprinting methods
 */

(function() {
    'use strict';

    const AudioInterceptor = {
        seed: null,
        noiseLevel: 0.0001,
        
        init(profile) {
            this.seed = profile.seed || Math.random();
            this.interceptAudioContext();
            this.interceptOfflineAudioContext();
        },

        seededRandom(index) {
            const x = Math.sin(this.seed + index) * 10000;
            return x - Math.floor(x);
        },

        interceptAudioContext() {
            const self = this;
            
            // Store original constructors
            const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
            const OriginalOfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
            
            if (OriginalAudioContext) {
                // Create proxy for AudioContext
                window.AudioContext = new Proxy(OriginalAudioContext, {
                    construct(target, args) {
                        const context = new target(...args);
                        self.wrapAudioContext(context);
                        return context;
                    }
                });
                
                // Preserve constructor properties
                window.AudioContext.prototype = OriginalAudioContext.prototype;
                this.maskAsNative(window.AudioContext, 'AudioContext');
            }
        },

        interceptOfflineAudioContext() {
            const self = this;
            const OriginalOfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
            
            if (OriginalOfflineAudioContext) {
                window.OfflineAudioContext = new Proxy(OriginalOfflineAudioContext, {
                    construct(target, args) {
                        const context = new target(...args);
                        self.wrapAudioContext(context);
                        return context;
                    }
                });
                
                window.OfflineAudioContext.prototype = OriginalOfflineAudioContext.prototype;
                this.maskAsNative(window.OfflineAudioContext, 'OfflineAudioContext');
            }
        },

        wrapAudioContext(context) {
            // Intercept createAnalyser
            const originalCreateAnalyser = context.createAnalyser;
            const self = this;
            
            context.createAnalyser = function() {
                const analyser = originalCreateAnalyser.apply(this, arguments);
                self.wrapAnalyserNode(analyser);
                return analyser;
            };
            
            // Intercept createOscillator
            const originalCreateOscillator = context.createOscillator;
            context.createOscillator = function() {
                const oscillator = originalCreateOscillator.apply(this, arguments);
                self.wrapOscillatorNode(oscillator);
                return oscillator;
            };

            // Intercept createDynamicsCompressor
            const originalCreateCompressor = context.createDynamicsCompressor;
            context.createDynamicsCompressor = function() {
                const compressor = originalCreateCompressor.apply(this, arguments);
                self.wrapCompressorNode(compressor);
                return compressor;
            };
        },

        wrapAnalyserNode(analyser) {
            const self = this;
            
            // Intercept getFloatFrequencyData
            const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
            analyser.getFloatFrequencyData = function(array) {
                originalGetFloatFrequencyData.call(this, array);
                
                // Add deterministic noise
                for (let i = 0; i < array.length; i++) {
                    const noise = (self.seededRandom(i) - 0.5) * self.noiseLevel;
                    array[i] += noise;
                }
                
                return array;
            };
            
            // Intercept getByteFrequencyData
            const originalGetByteFrequencyData = analyser.getByteFrequencyData;
            analyser.getByteFrequencyData = function(array) {
                originalGetByteFrequencyData.call(this, array);
                
                // Add deterministic noise
                for (let i = 0; i < array.length; i++) {
                    const noise = Math.round((self.seededRandom(i) - 0.5) * 2);
                    array[i] = Math.max(0, Math.min(255, array[i] + noise));
                }
                
                return array;
            };
            
            // Intercept getFloatTimeDomainData
            const originalGetFloatTimeDomainData = analyser.getFloatTimeDomainData;
            analyser.getFloatTimeDomainData = function(array) {
                originalGetFloatTimeDomainData.call(this, array);
                
                // Add minimal noise to time domain data
                for (let i = 0; i < array.length; i++) {
                    const noise = (self.seededRandom(i) - 0.5) * self.noiseLevel * 0.1;
                    array[i] += noise;
                }
                
                return array;
            };
        },

        wrapOscillatorNode(oscillator) {
            const self = this;
            
            // Add slight frequency variation
            const originalFrequency = Object.getOwnPropertyDescriptor(OscillatorNode.prototype, 'frequency');
            if (originalFrequency) {
                Object.defineProperty(oscillator, 'frequency', {
                    get: function() {
                        const freq = originalFrequency.get.call(this);
                        // Add tiny frequency drift
                        freq.value += (self.seededRandom(Date.now()) - 0.5) * 0.001;
                        return freq;
                    },
                    set: originalFrequency.set,
                    enumerable: true,
                    configurable: true
                });
            }
        },

        wrapCompressorNode(compressor) {
            const self = this;
            
            // Add slight variations to compressor parameters
            const properties = ['threshold', 'knee', 'ratio', 'attack', 'release'];
            
            properties.forEach((prop, index) => {
                const original = Object.getOwnPropertyDescriptor(DynamicsCompressorNode.prototype, prop);
                if (original) {
                    Object.defineProperty(compressor, prop, {
                        get: function() {
                            const param = original.get.call(this);
                            // Add tiny variations
                            const variation = 1 + (self.seededRandom(index) - 0.5) * 0.0001;
                            param.value *= variation;
                            return param;
                        },
                        set: original.set,
                        enumerable: true,
                        configurable: true
                    });
                }
            });
        },

        maskAsNative(func, name) {
            func.toString = function() {
                return `function ${name}() { [native code] }`;
            };
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AudioInterceptor;
    } else {
        window.AudioInterceptor = AudioInterceptor;
    }
})();
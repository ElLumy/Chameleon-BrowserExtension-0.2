/**
 * Jitter Utilities
 * Provides realistic timing jitter for API responses
 * FIXED: Removed busy-wait implementation, now uses async delays only
 */

(function() {
    'use strict';

    const JitterUtils = {
        // Default jitter parameters for different APIs
        jitterParams: {
            canvas: { mean: 4, stdDev: 1.5 },
            webgl: { mean: 1, stdDev: 0.5 },
            audio: { mean: 2, stdDev: 0.8 },
            battery: { mean: 15, stdDev: 5 },
            font: { mean: 0.5, stdDev: 0.2 },
            general: { mean: 1, stdDev: 0.3 }
        },

        /**
         * Box-Muller transform for Gaussian distribution
         */
        randomGaussian(mean, stdDev) {
            let u1 = 1 - Math.random(); // (0, 1]
            let u2 = Math.random();
            
            let z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            return z0 * stdDev + mean;
        },

        /**
         * Add realistic jitter to API call
         */
        async addJitter(apiType = 'general') {
            const params = this.jitterParams[apiType] || this.jitterParams.general;
            
            // Generate jitter value using Gaussian distribution
            let jitterMs = this.randomGaussian(params.mean, params.stdDev);
            
            // Ensure non-negative
            jitterMs = Math.max(0.1, jitterMs);
            
            // Apply jitter using setTimeout instead of busy wait
            return new Promise(resolve => {
                setTimeout(resolve, jitterMs);
            });
        },

        /**
         * Synchronous jitter alternative using microtasks
         * This creates a delay without blocking the main thread
         */
        addMicrotaskJitter(apiType = 'general') {
            const params = this.jitterParams[apiType] || this.jitterParams.general;
            let jitterMs = this.randomGaussian(params.mean, params.stdDev);
            jitterMs = Math.max(0.1, jitterMs);
            
            // Use queueMicrotask for minimal delay without blocking
            return new Promise(resolve => {
                const startTime = performance.now();
                
                function checkTime() {
                    if (performance.now() - startTime >= jitterMs) {
                        resolve();
                    } else {
                        // Use queueMicrotask instead of busy wait
                        queueMicrotask(checkTime);
                    }
                }
                
                queueMicrotask(checkTime);
            });
        },

        /**
         * Wrap a function with async jitter
         */
        wrapWithJitter(func, apiType = 'general') {
            const self = this;
            
            return async function(...args) {
                // Add jitter before execution
                await self.addJitter(apiType);
                
                // Execute original function
                const result = func.apply(this, args);
                
                // Handle both sync and async functions
                if (result instanceof Promise) {
                    return await result;
                }
                return result;
            };
        },

        /**
         * Wrap a synchronous function with minimal non-blocking jitter
         * Uses requestIdleCallback for better performance
         */
        wrapWithNonBlockingJitter(func, apiType = 'general') {
            const self = this;
            
            return function(...args) {
                const params = self.jitterParams[apiType] || self.jitterParams.general;
                let jitterMs = self.randomGaussian(params.mean, params.stdDev);
                jitterMs = Math.max(0.1, jitterMs);
                
                // For very small delays, execute immediately
                if (jitterMs < 1) {
                    return func.apply(this, args);
                }
                
                // For larger delays, use async approach
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(func.apply(this, args));
                    }, jitterMs);
                });
            };
        },

        /**
         * Create a jittered proxy for an object's methods
         */
        createJitteredProxy(target, methodsConfig) {
            const self = this;
            
            return new Proxy(target, {
                get(obj, prop) {
                    const original = obj[prop];
                    
                    // Check if this property should have jitter
                    if (typeof original === 'function' && methodsConfig[prop]) {
                        const apiType = methodsConfig[prop];
                        
                        // Return wrapped function with non-blocking jitter
                        return self.wrapWithNonBlockingJitter(original.bind(obj), apiType);
                    }
                    
                    return original;
                }
            });
        },

        /**
         * Add variable network latency simulation
         */
        addNetworkJitter() {
            // Simulate network latency (20-100ms)
            const baseLatency = 20;
            const variableLatency = Math.random() * 80;
            
            return new Promise(resolve => {
                setTimeout(resolve, baseLatency + variableLatency);
            });
        },

        /**
         * Simulate CPU load without blocking
         * Uses requestIdleCallback for better performance
         */
        async simulateCPULoad(intensity = 0.5) {
            return new Promise((resolve) => {
                const iterations = Math.floor(100 * intensity);
                let completed = 0;
                let result = 0;
                
                function processChunk(deadline) {
                    // Process in chunks to avoid blocking
                    while (completed < iterations && deadline.timeRemaining() > 1) {
                        result += Math.sqrt(completed) * Math.sin(completed);
                        completed++;
                    }
                    
                    if (completed < iterations) {
                        // Schedule next chunk
                        requestIdleCallback(processChunk);
                    } else {
                        resolve(result);
                    }
                }
                
                // Use requestIdleCallback if available, otherwise use setTimeout
                if (typeof requestIdleCallback !== 'undefined') {
                    requestIdleCallback(processChunk);
                } else {
                    setTimeout(() => {
                        for (let i = 0; i < iterations; i++) {
                            result += Math.sqrt(i) * Math.sin(i);
                        }
                        resolve(result);
                    }, 0);
                }
            });
        },

        /**
         * Create realistic timing pattern
         */
        createTimingPattern(count = 10) {
            const pattern = [];
            let lastTime = 0;
            
            for (let i = 0; i < count; i++) {
                // Increasing complexity over time
                const complexity = 1 + (i / count);
                const jitter = this.randomGaussian(2 * complexity, 0.5);
                
                lastTime += Math.max(1, jitter);
                pattern.push(lastTime);
            }
            
            return pattern;
        },

        /**
         * Mimic human-like interaction delays
         */
        addHumanDelay(actionType = 'click') {
            const delays = {
                'click': { min: 100, max: 300 },
                'type': { min: 50, max: 150 },
                'scroll': { min: 200, max: 500 },
                'hover': { min: 150, max: 400 },
                'focus': { min: 100, max: 250 }
            };
            
            const delay = delays[actionType] || delays.click;
            const ms = delay.min + Math.random() * (delay.max - delay.min);
            
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * Add micro-variations to numeric values
         * Useful for adding slight variations to measurements
         */
        addNumericJitter(value, variance = 0.01) {
            const jitter = this.randomGaussian(0, variance);
            return value * (1 + jitter);
        },

        /**
         * Create a rate limiter for API calls
         */
        createRateLimiter(maxCallsPerSecond = 10) {
            const minInterval = 1000 / maxCallsPerSecond;
            let lastCallTime = 0;
            
            return async function() {
                const now = Date.now();
                const timeSinceLastCall = now - lastCallTime;
                
                if (timeSinceLastCall < minInterval) {
                    const delay = minInterval - timeSinceLastCall;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                lastCallTime = Date.now();
            };
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = JitterUtils;
    } else {
        window.JitterUtils = JitterUtils;
    }
})();
/**
 * Detection Utilities
 * Helps identify and counter fingerprinting attempts
 */

(function() {
    'use strict';

    const DetectionUtils = {
        // Track detected fingerprinting attempts
        detectionLog: [],
        suspiciousPatterns: new Set(),
        
        /**
         * Initialize detection monitoring
         */
        init() {
            this.monitorSuspiciousAPIs();
            this.detectKnownScripts();
            this.trackAccessPatterns();
        },

        /**
         * Monitor suspicious API access patterns
         */
        monitorSuspiciousAPIs() {
            const suspiciousAPIs = [
                'navigator.hardwareConcurrency',
                'navigator.deviceMemory',
                'navigator.plugins',
                'screen.width',
                'screen.height',
                'WebGLRenderingContext.prototype.getParameter',
                'CanvasRenderingContext2D.prototype.getImageData',
                'AudioContext.prototype.createOscillator'
            ];
            
            // Track rapid successive calls
            const accessTimes = new Map();
            
            suspiciousAPIs.forEach(api => {
                const parts = api.split('.');
                let obj = window;
                
                for (let i = 0; i < parts.length - 1; i++) {
                    obj = obj[parts[i]];
                    if (!obj) return;
                }
                
                const prop = parts[parts.length - 1];
                const original = Object.getOwnPropertyDescriptor(obj, prop);
                
                if (original && original.get) {
                    Object.defineProperty(obj, prop, {
                        get: function() {
                            // Log access
                            const now = Date.now();
                            const lastAccess = accessTimes.get(api) || 0;
                            
                            if (now - lastAccess < 100) {
                                // Rapid access detected
                                DetectionUtils.logSuspiciousActivity('rapid_api_access', api);
                            }
                            
                            accessTimes.set(api, now);
                            return original.get.call(this);
                        },
                        configurable: true,
                        enumerable: true
                    });
                }
            });
        },

        /**
         * Detect known fingerprinting scripts
         */
        detectKnownScripts() {
            const fingerprintingSignatures = [
                // FingerprintJS
                'Fingerprint2',
                'FingerprintJS',
                'fingerprint2.min.js',
                'fingerprint.min.js',
                
                // CreepJS
                'creepjs',
                'creep.js',
                
                // ClientJS
                'ClientJS',
                'client.min.js',
                
                // Canvas fingerprinting
                'canvas-fingerprint',
                'toDataURL',
                
                // WebGL fingerprinting
                'webgl-fingerprint',
                'getParameter',
                
                // Audio fingerprinting
                'audio-fingerprint',
                'AudioContext',
                
                // Generic patterns
                'fingerprint',
                'fp_',
                'device_id',
                'browser_id',
                'tracking_id'
            ];
            
            // Monitor script loading
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.tagName === 'SCRIPT') {
                            const src = node.src || '';
                            const content = node.textContent || '';
                            
                            fingerprintingSignatures.forEach(signature => {
                                if (src.includes(signature) || content.includes(signature)) {
                                    this.logSuspiciousActivity('fingerprinting_script', signature);
                                }
                            });
                        }
                    });
                });
            });
            
            if (document.body) {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        },

        /**
         * Track API access patterns
         */
        trackAccessPatterns() {
            const patterns = {
                canvasFingerprinting: [],
                webglFingerprinting: [],
                audioFingerprinting: [],
                fontFingerprinting: []
            };
            
            // Track canvas operations
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(...args) {
                patterns.canvasFingerprinting.push({
                    timestamp: Date.now(),
                    method: 'toDataURL'
                });
                
                if (patterns.canvasFingerprinting.length > 5) {
                    DetectionUtils.logSuspiciousActivity('canvas_fingerprinting', 'excessive_toDataURL');
                }
                
                return originalToDataURL.apply(this, args);
            };
        },

        /**
         * Check if current page is fingerprinting
         */
        isFingerprinting() {
            // Check for multiple indicators
            const indicators = {
                rapidAPICalls: this.detectionLog.filter(log => 
                    log.type === 'rapid_api_access' && 
                    Date.now() - log.timestamp < 5000
                ).length > 10,
                
                knownScripts: this.detectionLog.some(log => 
                    log.type === 'fingerprinting_script'
                ),
                
                canvasOperations: this.detectionLog.filter(log => 
                    log.type === 'canvas_fingerprinting'
                ).length > 3,
                
                suspiciousPatterns: this.suspiciousPatterns.size > 5
            };
            
            const score = Object.values(indicators).filter(Boolean).length;
            return score >= 2; // At least 2 indicators
        },

        /**
         * Log suspicious activity
         */
        logSuspiciousActivity(type, details) {
            const entry = {
                type,
                details,
                timestamp: Date.now(),
                url: window.location.href
            };
            
            this.detectionLog.push(entry);
            this.suspiciousPatterns.add(type);
            
            // Keep log size manageable
            if (this.detectionLog.length > 100) {
                this.detectionLog.shift();
            }
            
            console.log('[Chameleon Detection]', type, details);
            
            // Notify background script
            if (chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({
                    action: 'fingerprintingDetected',
                    data: entry
                }).catch(() => {});
            }
        },

        /**
         * Get detection report
         */
        getDetectionReport() {
            const report = {
                isFingerprinting: this.isFingerprinting(),
                suspiciousPatterns: Array.from(this.suspiciousPatterns),
                recentActivity: this.detectionLog.slice(-10),
                statistics: {
                    totalDetections: this.detectionLog.length,
                    uniquePatterns: this.suspiciousPatterns.size,
                    timeRange: {
                        start: this.detectionLog[0]?.timestamp,
                        end: this.detectionLog[this.detectionLog.length - 1]?.timestamp
                    }
                }
            };
            
            return report;
        },

        /**
         * Check for bot detection scripts
         */
        detectBotDetection() {
            const botDetectionSignatures = [
                'recaptcha',
                'grecaptcha',
                'hcaptcha',
                'cloudflare',
                'cf-challenge',
                'bot-detection',
                'antibotCookie',
                'botguard',
                'datadome',
                'perimeterx',
                'distilnetworks',
                'shieldsquare',
                'kasada'
            ];
            
            // Check for bot detection scripts
            const scripts = document.querySelectorAll('script');
            const detected = [];
            
            scripts.forEach(script => {
                const src = script.src || '';
                const content = script.textContent || '';
                
                botDetectionSignatures.forEach(signature => {
                    if (src.includes(signature) || content.includes(signature)) {
                        detected.push(signature);
                    }
                });
            });
            
            if (detected.length > 0) {
                this.logSuspiciousActivity('bot_detection', detected);
            }
            
            return detected;
        },

        /**
         * Analyze stack traces for detection attempts
         */
        analyzeStackTrace() {
            const stack = new Error().stack;
            
            // Check for suspicious function names
            const suspiciousFunctions = [
                'fingerprint',
                'getFingerprint',
                'collectData',
                'trackUser',
                'identify',
                'getDeviceId',
                'getBrowserId'
            ];
            
            suspiciousFunctions.forEach(func => {
                if (stack.includes(func)) {
                    this.logSuspiciousActivity('suspicious_function', func);
                }
            });
        },

        /**
         * Detect timing attacks
         */
        detectTimingAttacks() {
            const timings = [];
            let lastCall = 0;
            
            return function(apiName) {
                const now = performance.now();
                
                if (lastCall > 0) {
                    const delta = now - lastCall;
                    timings.push(delta);
                    
                    // Check for suspiciously consistent timing
                    if (timings.length > 10) {
                        const avg = timings.reduce((a, b) => a + b) / timings.length;
                        const variance = timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / timings.length;
                        
                        if (variance < 0.1) {
                            // Very consistent timing, likely automated
                            this.logSuspiciousActivity('timing_attack', apiName);
                        }
                    }
                }
                
                lastCall = now;
            };
        },

        /**
         * Clear detection data
         */
        clearDetectionData() {
            this.detectionLog = [];
            this.suspiciousPatterns.clear();
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DetectionUtils;
    } else {
        window.DetectionUtils = DetectionUtils;
    }
})();
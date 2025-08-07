/**
 * Seed Manager
 * Generates and manages deterministic seeds for per-session profile generation
 * FIXED: Removed sessionStorage usage to prevent cross-iframe fingerprinting
 */

(function() {
    'use strict';

    const SeedManager = {
        currentSeed: null,
        sessionStartTime: Date.now(),
        domainSeeds: new Map(), // Store seeds per domain in memory only
        
        /**
         * Generate a new seed for the current session
         * Uses crypto API for high entropy
         */
        generateSeed() {
            if (window.crypto && window.crypto.getRandomValues) {
                const array = new Uint32Array(8);
                window.crypto.getRandomValues(array);
                
                // Convert to hex string
                this.currentSeed = Array.from(array)
                    .map(num => num.toString(16).padStart(8, '0'))
                    .join('');
            } else {
                // Fallback to Math.random (less secure)
                this.currentSeed = this.generateFallbackSeed();
            }
            
            // Store in memory for this domain
            this.storeSeedInMemory();
            
            return this.currentSeed;
        },

        /**
         * Fallback seed generation using Math.random
         */
        generateFallbackSeed() {
            let seed = '';
            for (let i = 0; i < 64; i++) {
                seed += Math.floor(Math.random() * 16).toString(16);
            }
            return seed;
        },

        /**
         * Get or create seed for current session
         * Seeds are domain-specific and session-specific
         */
        getSeed() {
            if (this.currentSeed) {
                return this.currentSeed;
            }
            
            // Try to retrieve from memory for this domain
            const domain = this.getCurrentDomain();
            this.currentSeed = this.domainSeeds.get(domain);
            
            if (!this.currentSeed) {
                this.generateSeed();
            }
            
            return this.currentSeed;
        },

        /**
         * Get current domain for seed isolation
         */
        getCurrentDomain() {
            try {
                return window.location.hostname || 'localhost';
            } catch (e) {
                return 'unknown';
            }
        },

        /**
         * Store seed in memory only (not in storage)
         */
        storeSeedInMemory() {
            const domain = this.getCurrentDomain();
            this.domainSeeds.set(domain, this.currentSeed);
            
            // Limit memory usage - keep only last 100 domains
            if (this.domainSeeds.size > 100) {
                const firstKey = this.domainSeeds.keys().next().value;
                this.domainSeeds.delete(firstKey);
            }
        },

        /**
         * Clear current seed (forces new profile on next access)
         */
        clearSeed() {
            this.currentSeed = null;
            const domain = this.getCurrentDomain();
            this.domainSeeds.delete(domain);
        },

        /**
         * Generate deterministic random number from seed and index
         */
        random(index = 0) {
            const seed = this.getSeed();
            const hash = this.hash(`${seed}-${index}`);
            
            // Convert hash to number between 0 and 1
            const num = parseInt(hash.substr(0, 8), 16);
            return num / 0xFFFFFFFF;
        },

        /**
         * Generate deterministic random integer between min and max
         */
        randomInt(min, max, index = 0) {
            const rand = this.random(index);
            return Math.floor(rand * (max - min + 1)) + min;
        },

        /**
         * Select random item from array using seed
         */
        randomChoice(array, index = 0) {
            if (!array || array.length === 0) return null;
            const idx = this.randomInt(0, array.length - 1, index);
            return array[idx];
        },

        /**
         * Select random item from weighted array
         */
        randomWeightedChoice(items, weights, index = 0) {
            if (!items || items.length === 0) return null;
            
            // Calculate total weight
            const totalWeight = weights.reduce((sum, w) => sum + w, 0);
            
            // Get random value
            let random = this.random(index) * totalWeight;
            
            // Find selected item
            for (let i = 0; i < items.length; i++) {
                random -= weights[i];
                if (random <= 0) {
                    return items[i];
                }
            }
            
            return items[items.length - 1];
        },

        /**
         * Simple hash function for string to hex
         * Using FNV-1a hash for better distribution
         */
        hash(str) {
            const FNV_OFFSET_BASIS = 2166136261;
            const FNV_PRIME = 16777619;
            
            let hash = FNV_OFFSET_BASIS;
            
            for (let i = 0; i < str.length; i++) {
                hash ^= str.charCodeAt(i);
                hash = Math.imul(hash, FNV_PRIME);
            }
            
            // Convert to positive hex string
            return (hash >>> 0).toString(16).padStart(8, '0');
        },

        /**
         * Generate Gaussian random number (Box-Muller transform)
         */
        randomGaussian(mean = 0, stdDev = 1, index = 0) {
            const u1 = Math.max(0.001, this.random(index * 2)); // Avoid log(0)
            const u2 = this.random(index * 2 + 1);
            
            const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            return z0 * stdDev + mean;
        },

        /**
         * Shuffle array deterministically
         */
        shuffle(array, startIndex = 0) {
            const shuffled = [...array];
            
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = this.randomInt(0, i, startIndex + i);
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            return shuffled;
        },

        /**
         * Create a time-windowed seed that changes periodically
         * Useful for auto-rotation features
         */
        getTimeWindowedSeed(windowMs = 3600000) { // 1 hour default
            const window = Math.floor(Date.now() / windowMs);
            const baseSeed = this.getSeed();
            return this.hash(`${baseSeed}-${window}`);
        },

        /**
         * Generate consistent seed for a specific context
         * Useful for iframe isolation
         */
        getContextSeed(context = 'main') {
            const baseSeed = this.getSeed();
            return this.hash(`${baseSeed}-${context}`);
        },

        /**
         * Check if seed should be rotated based on time
         */
        shouldRotate(maxAgeMs = 3600000) { // 1 hour default
            const age = Date.now() - this.sessionStartTime;
            return age > maxAgeMs;
        },

        /**
         * Export seed for debugging (only in debug mode)
         */
        exportSeed() {
            if (window.__chameleon_debug_mode) {
                return {
                    seed: this.currentSeed,
                    domain: this.getCurrentDomain(),
                    sessionStart: this.sessionStartTime,
                    age: Date.now() - this.sessionStartTime
                };
            }
            return null;
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SeedManager;
    } else {
        window.SeedManager = SeedManager;
    }
})();
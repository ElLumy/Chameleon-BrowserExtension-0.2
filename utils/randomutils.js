/**
 * Random Utilities
 * Provides deterministic and non-deterministic random functions
 */

(function() {
    'use strict';

    const RandomUtils = {
        /**
         * Generate random hex string
         */
        randomHex(length = 16) {
            const array = new Uint8Array(length / 2);
            
            if (window.crypto && window.crypto.getRandomValues) {
                window.crypto.getRandomValues(array);
            } else {
                // Fallback
                for (let i = 0; i < array.length; i++) {
                    array[i] = Math.floor(Math.random() * 256);
                }
            }
            
            return Array.from(array)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        },

        /**
         * Generate random UUID v4
         */
        randomUUID() {
            if (crypto.randomUUID) {
                return crypto.randomUUID();
            }
            
            // Fallback implementation
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        /**
         * Seeded random number generator (LCG)
         */
        createSeededRandom(seed) {
            let state = seed;
            
            return function() {
                // Linear congruential generator
                state = (state * 1664525 + 1013904223) % 4294967296;
                return state / 4294967296;
            };
        },

        /**
         * Random integer between min and max (inclusive)
         */
        randomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        /**
         * Random float between min and max
         */
        randomFloat(min, max) {
            return Math.random() * (max - min) + min;
        },

        /**
         * Random boolean with probability
         */
        randomBool(probability = 0.5) {
            return Math.random() < probability;
        },

        /**
         * Random element from array
         */
        randomElement(array) {
            if (!array || array.length === 0) return null;
            return array[Math.floor(Math.random() * array.length)];
        },

        /**
         * Random sample from array
         */
        randomSample(array, size) {
            if (!array || size <= 0) return [];
            
            const shuffled = [...array];
            const sample = [];
            
            for (let i = 0; i < Math.min(size, array.length); i++) {
                const j = Math.floor(Math.random() * (shuffled.length - i)) + i;
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                sample.push(shuffled[i]);
            }
            
            return sample;
        },

        /**
         * Weighted random selection
         */
        weightedRandom(items, weights) {
            if (!items || items.length === 0) return null;
            
            const totalWeight = weights.reduce((sum, w) => sum + w, 0);
            let random = Math.random() * totalWeight;
            
            for (let i = 0; i < items.length; i++) {
                random -= weights[i];
                if (random <= 0) {
                    return items[i];
                }
            }
            
            return items[items.length - 1];
        },

        /**
         * Shuffle array (Fisher-Yates)
         */
        shuffle(array) {
            const shuffled = [...array];
            
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            return shuffled;
        },

        /**
         * Generate random string
         */
        randomString(length, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
            let result = '';
            
            for (let i = 0; i < length; i++) {
                result += charset[Math.floor(Math.random() * charset.length)];
            }
            
            return result;
        },

        /**
         * Generate random color (hex)
         */
        randomColor() {
            return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        },

        /**
         * Generate random IP address
         */
        randomIP() {
            return Array.from({length: 4}, () => this.randomInt(1, 254)).join('.');
        },

        /**
         * Generate random MAC address
         */
        randomMAC() {
            const octets = Array.from({length: 6}, () => 
                this.randomInt(0, 255).toString(16).padStart(2, '0')
            );
            return octets.join(':');
        },

        /**
         * Perlin noise generator
         */
        createPerlinNoise(seed = Math.random()) {
            const permutation = this.shuffle(Array.from({length: 256}, (_, i) => i));
            const p = [...permutation, ...permutation];
            
            function fade(t) {
                return t * t * t * (t * (t * 6 - 15) + 10);
            }
            
            function lerp(t, a, b) {
                return a + t * (b - a);
            }
            
            function grad(hash, x, y, z) {
                const h = hash & 15;
                const u = h < 8 ? x : y;
                const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
                return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
            }
            
            return function(x, y = 0, z = 0) {
                const X = Math.floor(x) & 255;
                const Y = Math.floor(y) & 255;
                const Z = Math.floor(z) & 255;
                
                x -= Math.floor(x);
                y -= Math.floor(y);
                z -= Math.floor(z);
                
                const u = fade(x);
                const v = fade(y);
                const w = fade(z);
                
                const A = p[X] + Y;
                const AA = p[A] + Z;
                const AB = p[A + 1] + Z;
                const B = p[X + 1] + Y;
                const BA = p[B] + Z;
                const BB = p[B + 1] + Z;
                
                return lerp(w,
                    lerp(v,
                        lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
                        lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))
                    ),
                    lerp(v,
                        lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
                        lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))
                    )
                );
            };
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RandomUtils;
    } else {
        window.RandomUtils = RandomUtils;
    }
})();
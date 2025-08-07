/**
 * Hash Utilities
 * Provides hashing functions for deterministic value generation
 */

(function() {
    'use strict';

    const HashUtils = {
        /**
         * Simple hash function (djb2)
         */
        simpleHash(str) {
            let hash = 5381;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.abs(hash);
        },

        /**
         * FNV-1a hash (32-bit)
         */
        fnv1aHash(str) {
            const FNV_OFFSET_BASIS = 2166136261;
            const FNV_PRIME = 16777619;
            
            let hash = FNV_OFFSET_BASIS;
            
            for (let i = 0; i < str.length; i++) {
                hash ^= str.charCodeAt(i);
                hash = Math.imul(hash, FNV_PRIME);
            }
            
            return hash >>> 0; // Convert to unsigned 32-bit
        },

        /**
         * MurmurHash3 (32-bit)
         */
        murmurHash3(str, seed = 0) {
            let h1 = seed;
            const c1 = 0xcc9e2d51;
            const c2 = 0x1b873593;
            const r1 = 15;
            const r2 = 13;
            const m = 5;
            const n = 0xe6546b64;
            
            const len = str.length;
            const nblocks = Math.floor(len / 4);
            
            for (let i = 0; i < nblocks; i++) {
                let k1 = 
                    (str.charCodeAt(i * 4) & 0xff) |
                    ((str.charCodeAt(i * 4 + 1) & 0xff) << 8) |
                    ((str.charCodeAt(i * 4 + 2) & 0xff) << 16) |
                    ((str.charCodeAt(i * 4 + 3) & 0xff) << 24);
                
                k1 = Math.imul(k1, c1);
                k1 = (k1 << r1) | (k1 >>> (32 - r1));
                k1 = Math.imul(k1, c2);
                
                h1 ^= k1;
                h1 = (h1 << r2) | (h1 >>> (32 - r2));
                h1 = Math.imul(h1, m) + n;
            }
            
            let k1 = 0;
            const remainder = len % 4;
            
            if (remainder >= 3) {
                k1 ^= (str.charCodeAt(nblocks * 4 + 2) & 0xff) << 16;
            }
            if (remainder >= 2) {
                k1 ^= (str.charCodeAt(nblocks * 4 + 1) & 0xff) << 8;
            }
            if (remainder >= 1) {
                k1 ^= str.charCodeAt(nblocks * 4) & 0xff;
                k1 = Math.imul(k1, c1);
                k1 = (k1 << r1) | (k1 >>> (32 - r1));
                k1 = Math.imul(k1, c2);
                h1 ^= k1;
            }
            
            h1 ^= len;
            h1 ^= h1 >>> 16;
            h1 = Math.imul(h1, 0x85ebca6b);
            h1 ^= h1 >>> 13;
            h1 = Math.imul(h1, 0xc2b2ae35);
            h1 ^= h1 >>> 16;
            
            return h1 >>> 0;
        },

        /**
         * CRC32 checksum
         */
        crc32(str) {
            const table = this.getCRC32Table();
            let crc = 0 ^ (-1);
            
            for (let i = 0; i < str.length; i++) {
                crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xFF];
            }
            
            return (crc ^ (-1)) >>> 0;
        },

        /**
         * Get CRC32 lookup table
         */
        getCRC32Table() {
            if (this.crc32Table) {
                return this.crc32Table;
            }
            
            const table = [];
            let c;
            
            for (let n = 0; n < 256; n++) {
                c = n;
                for (let k = 0; k < 8; k++) {
                    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
                }
                table[n] = c;
            }
            
            this.crc32Table = table;
            return table;
        },

        /**
         * SHA-1 hash (simplified, not cryptographically secure)
         */
        sha1(str) {
            function rotateLeft(n, b) {
                return (n << b) | (n >>> (32 - b));
            }
            
            let H0 = 0x67452301;
            let H1 = 0xEFCDAB89;
            let H2 = 0x98BADCFE;
            let H3 = 0x10325476;
            let H4 = 0xC3D2E1F0;
            
            const strBitLength = str.length * 8;
            str += '\u0080';
            
            while ((str.length * 8) % 512 !== 448) {
                str += '\u0000';
            }
            
            // Add length as 64-bit big-endian
            for (let i = 7; i >= 0; i--) {
                str += String.fromCharCode((strBitLength >>> (i * 8)) & 0xFF);
            }
            
            for (let i = 0; i < str.length; i += 64) {
                const W = new Array(80);
                
                for (let j = 0; j < 16; j++) {
                    W[j] = (str.charCodeAt(i + j * 4) << 24) |
                           (str.charCodeAt(i + j * 4 + 1) << 16) |
                           (str.charCodeAt(i + j * 4 + 2) << 8) |
                           str.charCodeAt(i + j * 4 + 3);
                }
                
                for (let j = 16; j < 80; j++) {
                    W[j] = rotateLeft(W[j-3] ^ W[j-8] ^ W[j-14] ^ W[j-16], 1);
                }
                
                let A = H0, B = H1, C = H2, D = H3, E = H4;
                
                for (let j = 0; j < 80; j++) {
                    let f, k;
                    
                    if (j < 20) {
                        f = (B & C) | ((~B) & D);
                        k = 0x5A827999;
                    } else if (j < 40) {
                        f = B ^ C ^ D;
                        k = 0x6ED9EBA1;
                    } else if (j < 60) {
                        f = (B & C) | (B & D) | (C & D);
                        k = 0x8F1BBCDC;
                    } else {
                        f = B ^ C ^ D;
                        k = 0xCA62C1D6;
                    }
                    
                    const temp = (rotateLeft(A, 5) + f + E + k + W[j]) & 0xFFFFFFFF;
                    E = D;
                    D = C;
                    C = rotateLeft(B, 30);
                    B = A;
                    A = temp;
                }
                
                H0 = (H0 + A) & 0xFFFFFFFF;
                H1 = (H1 + B) & 0xFFFFFFFF;
                H2 = (H2 + C) & 0xFFFFFFFF;
                H3 = (H3 + D) & 0xFFFFFFFF;
                H4 = (H4 + E) & 0xFFFFFFFF;
            }
            
            return [H0, H1, H2, H3, H4]
                .map(h => h.toString(16).padStart(8, '0'))
                .join('');
        },

        /**
         * Generate deterministic value from hash
         */
        hashToValue(hash, min, max) {
            const range = max - min;
            return min + (hash % range);
        },

        /**
         * Generate deterministic float from hash
         */
        hashToFloat(hash) {
            return (hash % 1000000) / 1000000;
        },

        /**
         * Generate deterministic boolean from hash
         */
        hashToBool(hash, probability = 0.5) {
            return this.hashToFloat(hash) < probability;
        },

        /**
         * Combine multiple hashes
         */
        combineHashes(...hashes) {
            let combined = 0;
            for (const hash of hashes) {
                combined = combined ^ (hash + 0x9e3779b9 + (combined << 6) + (combined >> 2));
            }
            return combined >>> 0;
        },

        /**
         * Create consistent hash from object
         */
        objectHash(obj) {
            const str = JSON.stringify(obj, Object.keys(obj).sort());
            return this.murmurHash3(str);
        },

        /**
         * Time-based hash (for session consistency)
         */
        timeBasedHash(seed, windowMs = 3600000) {
            const window = Math.floor(Date.now() / windowMs);
            return this.murmurHash3(`${seed}-${window}`);
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = HashUtils;
    } else {
        window.HashUtils = HashUtils;
    }
})();
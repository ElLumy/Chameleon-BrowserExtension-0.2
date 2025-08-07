/**
 * Canvas Interceptor
 * Adds deterministic noise to canvas operations based on edge detection
 * Following the advanced techniques from the Chameleon framework document
 */

(function() {
    'use strict';

    const CanvasInterceptor = {
        seed: null,
        noiseLevel: 0.002, // Very subtle noise
        
        init(profile) {
            this.seed = profile.seed || Math.random();
            this.interceptToDataURL();
            this.interceptGetImageData();
            this.interceptToBlob();
            this.interceptGetContext();
        },

        // Deterministic random based on seed
        seededRandom(x, y, channel) {
            const hash = this.hashCode(`${this.seed}-${x}-${y}-${channel}`);
            return (hash % 1000) / 1000;
        },

        hashCode(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash);
        },

        // Edge detection using Sobel operator
        detectEdges(imageData) {
            const width = imageData.width;
            const height = imageData.height;
            const data = imageData.data;
            const edges = new Uint8ClampedArray(width * height);
            
            // Sobel kernels
            const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
            const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
            
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    let pixelX = 0;
                    let pixelY = 0;
                    
                    // Apply Sobel kernels
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4;
                            const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
                            const kernelIdx = (ky + 1) * 3 + (kx + 1);
                            pixelX += gray * sobelX[kernelIdx];
                            pixelY += gray * sobelY[kernelIdx];
                        }
                    }
                    
                    // Calculate edge magnitude
                    const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
                    edges[y * width + x] = magnitude > 30 ? 1 : 0; // Threshold for edge detection
                }
            }
            
            return edges;
        },

        // Apply noise only to edges
        applyEdgeNoise(imageData) {
            const edges = this.detectEdges(imageData);
            const data = imageData.data;
            const width = imageData.width;
            const height = imageData.height;
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = y * width + x;
                    const pixelIdx = idx * 4;
                    
                    // Only apply noise to edge pixels
                    if (edges[idx] === 1) {
                        // Apply deterministic noise to RGB channels
                        for (let channel = 0; channel < 3; channel++) {
                            const noise = (this.seededRandom(x, y, channel) - 0.5) * 255 * this.noiseLevel;
                            data[pixelIdx + channel] = Math.max(0, Math.min(255, 
                                data[pixelIdx + channel] + noise));
                        }
                    }
                }
            }
            
            return imageData;
        },

        interceptToDataURL() {
            const original = HTMLCanvasElement.prototype.toDataURL;
            const self = this;
            
            HTMLCanvasElement.prototype.toDataURL = new Proxy(original, {
                apply(target, thisArg, args) {
                    // Get the canvas context
                    const ctx = thisArg.getContext('2d');
                    if (ctx) {
                        // Get image data
                        const imageData = ctx.getImageData(0, 0, thisArg.width, thisArg.height);
                        
                        // Apply edge-based noise
                        const noisyData = self.applyEdgeNoise(imageData);
                        
                        // Put the noisy data back
                        ctx.putImageData(noisyData, 0, 0);
                    }
                    
                    // Call original method
                    return Reflect.apply(target, thisArg, args);
                }
            });

            // Make it appear native
            this.maskAsNative(HTMLCanvasElement.prototype.toDataURL, 'toDataURL');
        },

        interceptGetImageData() {
            const original = CanvasRenderingContext2D.prototype.getImageData;
            const self = this;
            
            CanvasRenderingContext2D.prototype.getImageData = new Proxy(original, {
                apply(target, thisArg, args) {
                    const imageData = Reflect.apply(target, thisArg, args);
                    
                    // Apply edge-based noise
                    return self.applyEdgeNoise(imageData);
                }
            });

            this.maskAsNative(CanvasRenderingContext2D.prototype.getImageData, 'getImageData');
        },

        interceptToBlob() {
            const original = HTMLCanvasElement.prototype.toBlob;
            const self = this;
            
            if (original) {
                HTMLCanvasElement.prototype.toBlob = new Proxy(original, {
                    apply(target, thisArg, args) {
                        const [callback, ...restArgs] = args;
                        
                        // Wrap the callback to apply noise first
                        const wrappedCallback = function(blob) {
                            const ctx = thisArg.getContext('2d');
                            if (ctx) {
                                const imageData = ctx.getImageData(0, 0, thisArg.width, thisArg.height);
                                const noisyData = self.applyEdgeNoise(imageData);
                                ctx.putImageData(noisyData, 0, 0);
                            }
                            
                            if (callback) {
                                callback(blob);
                            }
                        };
                        
                        return Reflect.apply(target, thisArg, [wrappedCallback, ...restArgs]);
                    }
                });

                this.maskAsNative(HTMLCanvasElement.prototype.toBlob, 'toBlob');
            }
        },

        interceptGetContext() {
            const original = HTMLCanvasElement.prototype.getContext;
            const self = this;
            
            HTMLCanvasElement.prototype.getContext = new Proxy(original, {
                apply(target, thisArg, args) {
                    const context = Reflect.apply(target, thisArg, args);
                    
                    // Mark this context as intercepted
                    if (context && args[0] === '2d') {
                        context.__chameleon_intercepted = true;
                    }
                    
                    return context;
                }
            });

            this.maskAsNative(HTMLCanvasElement.prototype.getContext, 'getContext');
        },

        maskAsNative(func, name) {
            // Override toString to return native code
            func.toString = function() {
                return `function ${name}() { [native code] }`;
            };
            
            // Prevent detection via Function.prototype.toString.call
            const originalToString = Function.prototype.toString;
            Function.prototype.toString = new Proxy(originalToString, {
                apply(target, thisArg, args) {
                    if (thisArg === func) {
                        return `function ${name}() { [native code] }`;
                    }
                    return Reflect.apply(target, thisArg, args);
                }
            });
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CanvasInterceptor;
    } else {
        window.CanvasInterceptor = CanvasInterceptor;
    }
})();
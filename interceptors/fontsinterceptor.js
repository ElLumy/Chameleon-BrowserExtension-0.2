/**
 * Fonts Interceptor
 * Controls which fonts are detected as available based on the OS profile
 */

(function() {
    'use strict';

    const FontsInterceptor = {
        profile: null,
        systemFonts: [],
        
        init(profile) {
            this.profile = profile;
            this.systemFonts = this.getSystemFonts(profile);
            this.interceptFontDetection();
        },

        getSystemFonts(profile) {
            const os = profile.os?.name || '';
            let fonts = [];
            
            if (os.includes('Windows')) {
                fonts = [
                    'Arial', 'Arial Black', 'Arial Narrow', 'Arial Unicode MS',
                    'Calibri', 'Cambria', 'Cambria Math', 'Candara', 'Comic Sans MS',
                    'Consolas', 'Constantia', 'Corbel', 'Courier', 'Courier New',
                    'Franklin Gothic Medium', 'Gabriola', 'Georgia', 'Impact',
                    'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif',
                    'Palatino Linotype', 'Segoe Print', 'Segoe Script', 'Segoe UI',
                    'Segoe UI Light', 'Segoe UI Semibold', 'Segoe UI Symbol',
                    'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana',
                    'Webdings', 'Wingdings', 'Yu Gothic'
                ];
            } else if (os.includes('macOS')) {
                fonts = [
                    'American Typewriter', 'Andale Mono', 'Arial', 'Arial Black',
                    'Arial Narrow', 'Arial Rounded MT Bold', 'Arial Unicode MS',
                    'Avenir', 'Avenir Next', 'Avenir Next Condensed', 'Baskerville',
                    'Big Caslon', 'Bodoni 72', 'Bradley Hand', 'Brush Script MT',
                    'Chalkboard', 'Chalkboard SE', 'Chalkduster', 'Charter',
                    'Cochin', 'Comic Sans MS', 'Copperplate', 'Courier',
                    'Courier New', 'Didot', 'DIN Alternate', 'DIN Condensed',
                    'Futura', 'Geneva', 'Georgia', 'Gill Sans', 'Helvetica',
                    'Helvetica Neue', 'Herculanum', 'Hoefler Text', 'Impact',
                    'Lucida Grande', 'Luminari', 'Marker Felt', 'Menlo', 'Monaco',
                    'Noteworthy', 'Optima', 'Palatino', 'Papyrus', 'Phosphate',
                    'Rockwell', 'San Francisco', 'Savoye LET', 'SignPainter',
                    'Skia', 'Snell Roundhand', 'Tahoma', 'Times', 'Times New Roman',
                    'Trattatello', 'Trebuchet MS', 'Verdana', 'Zapfino'
                ];
            } else if (os.includes('Linux') || os.includes('Ubuntu')) {
                fonts = [
                    'Bitstream Charter', 'Century Schoolbook L', 'Courier 10 Pitch',
                    'DejaVu Sans', 'DejaVu Sans Mono', 'DejaVu Serif',
                    'Droid Sans', 'Droid Sans Mono', 'Droid Serif',
                    'FreeMono', 'FreeSans', 'FreeSerif', 'Liberation Mono',
                    'Liberation Sans', 'Liberation Sans Narrow', 'Liberation Serif',
                    'Nimbus Mono L', 'Nimbus Roman No9 L', 'Nimbus Sans L',
                    'Ubuntu', 'Ubuntu Condensed', 'Ubuntu Light', 'Ubuntu Mono',
                    'URW Bookman L', 'URW Chancery L', 'URW Gothic L', 'URW Palladio L'
                ];
            }
            
            return fonts;
        },

        interceptFontDetection() {
            const self = this;
            
            // Intercept common font detection methods
            this.interceptOffsetWidth();
            this.interceptGetComputedStyle();
            this.interceptFontFaceSet();
        },

        interceptOffsetWidth() {
            const self = this;
            const originalGetter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
            
            if (originalGetter) {
                Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
                    get: function() {
                        const width = originalGetter.get.call(this);
                        
                        // Check if this is likely a font detection element
                        if (self.isFontDetectionElement(this)) {
                            const fontFamily = window.getComputedStyle(this).fontFamily;
                            const requestedFont = self.extractFontName(fontFamily);
                            
                            // If font is not in our allowed list, return default width
                            if (requestedFont && !self.isFontAllowed(requestedFont)) {
                                // Return a consistent "fallback" width
                                return self.getFallbackWidth(this.textContent);
                            }
                        }
                        
                        return width;
                    },
                    configurable: true,
                    enumerable: true
                });
            }
        },

        interceptGetComputedStyle() {
            const original = window.getComputedStyle;
            const self = this;
            
            window.getComputedStyle = new Proxy(original, {
                apply(target, thisArg, args) {
                    const style = Reflect.apply(target, thisArg, args);
                    
                    // Create a proxy for the CSSStyleDeclaration
                    return new Proxy(style, {
                        get(target, prop) {
                            if (prop === 'fontFamily') {
                                const fontFamily = target[prop];
                                return self.filterFontFamily(fontFamily);
                            }
                            return target[prop];
                        }
                    });
                }
            });
            
            this.maskAsNative(window.getComputedStyle, 'getComputedStyle');
        },

        interceptFontFaceSet() {
            if (document.fonts && document.fonts.check) {
                const originalCheck = document.fonts.check;
                const self = this;
                
                document.fonts.check = function(font, text) {
                    const fontName = self.extractFontName(font);
                    
                    // Only return true for allowed fonts
                    if (fontName && !self.isFontAllowed(fontName)) {
                        return false;
                    }
                    
                    return originalCheck.call(this, font, text);
                };
                
                this.maskAsNative(document.fonts.check, 'check');
            }
        },

        isFontDetectionElement(element) {
            // Heuristics to detect font fingerprinting elements
            const text = element.textContent || '';
            const style = window.getComputedStyle(element);
            
            // Common test strings used in font detection
            const testStrings = ['mmmmmmmmmmlli', 'wwwwwwwwwww', 'WW', '@', 'mmm'];
            
            return (
                testStrings.includes(text) ||
                element.offsetHeight < 100 ||
                style.position === 'absolute' && style.visibility === 'hidden' ||
                style.position === 'absolute' && parseInt(style.left) < -1000
            );
        },

        extractFontName(fontFamily) {
            if (!fontFamily) return null;
            
            // Extract the first font name from the font-family string
            const match = fontFamily.match(/^["']?([^"',]+)/);
            return match ? match[1].trim() : null;
        },

        isFontAllowed(fontName) {
            // Check if font is in our allowed system fonts
            return this.systemFonts.some(font => 
                font.toLowerCase() === fontName.toLowerCase()
            );
        },

        filterFontFamily(fontFamily) {
            if (!fontFamily) return fontFamily;
            
            const fonts = fontFamily.split(',').map(f => f.trim());
            const filtered = fonts.filter(font => {
                const name = this.extractFontName(font);
                return !name || this.isFontAllowed(name);
            });
            
            return filtered.join(', ') || 'sans-serif';
        },

        getFallbackWidth(text) {
            // Return consistent width for fallback font
            // This simulates the width when font falls back to default
            const baseWidth = 10; // pixels per character for monospace
            return text.length * baseWidth;
        },

        maskAsNative(func, name) {
            func.toString = function() {
                return `function ${name}() { [native code] }`;
            };
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FontsInterceptor;
    } else {
        window.FontsInterceptor = FontsInterceptor;
    }
})();
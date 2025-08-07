/**
 * Timezone Interceptor
 * Spoofs timezone information to match IP geolocation
 */

(function() {
    'use strict';

    const TimezoneInterceptor = {
        profile: null,
        timezone: 'America/New_York',
        timezoneOffset: 300, // minutes from UTC
        
        init(profile) {
            this.profile = profile;
            this.detectTimezone(profile);
            this.interceptDateMethods();
            this.interceptIntlAPIs();
        },

        detectTimezone(profile) {
            // Map common locales to timezones
            const localeTimezoneMap = {
                'en-US': 'America/New_York',
                'en-GB': 'Europe/London',
                'de-DE': 'Europe/Berlin',
                'fr-FR': 'Europe/Paris',
                'es-ES': 'Europe/Madrid',
                'es-MX': 'America/Mexico_City',
                'pt-BR': 'America/Sao_Paulo',
                'it-IT': 'Europe/Rome',
                'ru-RU': 'Europe/Moscow',
                'zh-CN': 'Asia/Shanghai',
                'ja-JP': 'Asia/Tokyo',
                'ko-KR': 'Asia/Seoul',
                'en-AU': 'Australia/Sydney',
                'en-CA': 'America/Toronto',
                'en-IN': 'Asia/Kolkata'
            };
            
            const locale = profile.locale?.language || 'en-US';
            this.timezone = localeTimezoneMap[locale] || 'America/New_York';
            
            // Calculate offset for this timezone
            this.timezoneOffset = this.calculateOffset(this.timezone);
        },

        calculateOffset(timezone) {
            // Timezone offsets in minutes from UTC (standard time)
            const timezoneOffsets = {
                'America/New_York': 300,      // UTC-5
                'America/Chicago': 360,        // UTC-6
                'America/Denver': 420,         // UTC-7
                'America/Los_Angeles': 480,    // UTC-8
                'America/Toronto': 300,        // UTC-5
                'America/Vancouver': 480,      // UTC-8
                'America/Mexico_City': 360,    // UTC-6
                'America/Sao_Paulo': 180,      // UTC-3
                'Europe/London': 0,            // UTC+0
                'Europe/Paris': -60,           // UTC+1
                'Europe/Berlin': -60,          // UTC+1
                'Europe/Madrid': -60,          // UTC+1
                'Europe/Rome': -60,            // UTC+1
                'Europe/Moscow': -180,         // UTC+3
                'Asia/Shanghai': -480,         // UTC+8
                'Asia/Tokyo': -540,            // UTC+9
                'Asia/Seoul': -540,            // UTC+9
                'Asia/Kolkata': -330,          // UTC+5:30
                'Australia/Sydney': -660       // UTC+11
            };
            
            return timezoneOffsets[timezone] || 0;
        },

        interceptDateMethods() {
            const self = this;
            
            // Intercept getTimezoneOffset
            const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
            Date.prototype.getTimezoneOffset = function() {
                return self.timezoneOffset;
            };
            this.maskAsNative(Date.prototype.getTimezoneOffset, 'getTimezoneOffset');
            
            // Intercept toString methods to show correct timezone
            const originalToString = Date.prototype.toString;
            Date.prototype.toString = function() {
                const result = originalToString.call(this);
                // Replace timezone abbreviation
                return self.adjustTimezoneString(result);
            };
            this.maskAsNative(Date.prototype.toString, 'toString');
            
            // Intercept toTimeString
            const originalToTimeString = Date.prototype.toTimeString;
            Date.prototype.toTimeString = function() {
                const result = originalToTimeString.call(this);
                return self.adjustTimezoneString(result);
            };
            this.maskAsNative(Date.prototype.toTimeString, 'toTimeString');
            
            // Intercept toLocaleString methods
            this.interceptToLocaleString();
        },

        interceptToLocaleString() {
            const self = this;
            
            // Store originals
            const originalToLocaleString = Date.prototype.toLocaleString;
            const originalToLocaleDateString = Date.prototype.toLocaleDateString;
            const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
            
            Date.prototype.toLocaleString = function(locales, options) {
                options = options || {};
                options.timeZone = options.timeZone || self.timezone;
                return originalToLocaleString.call(this, locales, options);
            };
            
            Date.prototype.toLocaleDateString = function(locales, options) {
                options = options || {};
                options.timeZone = options.timeZone || self.timezone;
                return originalToLocaleDateString.call(this, locales, options);
            };
            
            Date.prototype.toLocaleTimeString = function(locales, options) {
                options = options || {};
                options.timeZone = options.timeZone || self.timezone;
                return originalToLocaleTimeString.call(this, locales, options);
            };
            
            this.maskAsNative(Date.prototype.toLocaleString, 'toLocaleString');
            this.maskAsNative(Date.prototype.toLocaleDateString, 'toLocaleDateString');
            this.maskAsNative(Date.prototype.toLocaleTimeString, 'toLocaleTimeString');
        },

        interceptIntlAPIs() {
            const self = this;
            
            // Intercept Intl.DateTimeFormat
            const OriginalDateTimeFormat = Intl.DateTimeFormat;
            
            Intl.DateTimeFormat = new Proxy(OriginalDateTimeFormat, {
                construct(target, args) {
                    let [locales, options] = args;
                    options = options || {};
                    
                    // Force our timezone if not specified
                    if (!options.timeZone) {
                        options.timeZone = self.timezone;
                    }
                    
                    return new target(locales, options);
                }
            });
            
            // Preserve prototype
            Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
            
            // Intercept resolvedOptions
            const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
            Intl.DateTimeFormat.prototype.resolvedOptions = function() {
                const options = originalResolvedOptions.call(this);
                
                // Ensure our timezone is reflected
                if (!options.timeZone || options.timeZone === 'UTC') {
                    options.timeZone = self.timezone;
                }
                
                return options;
            };
            
            this.maskAsNative(Intl.DateTimeFormat.prototype.resolvedOptions, 'resolvedOptions');
        },

        adjustTimezoneString(str) {
            // Map timezone to abbreviation
            const timezoneAbbreviations = {
                'America/New_York': 'EST',
                'America/Chicago': 'CST',
                'America/Denver': 'MST',
                'America/Los_Angeles': 'PST',
                'America/Toronto': 'EST',
                'Europe/London': 'GMT',
                'Europe/Paris': 'CET',
                'Europe/Berlin': 'CET',
                'Europe/Moscow': 'MSK',
                'Asia/Shanghai': 'CST',
                'Asia/Tokyo': 'JST',
                'Asia/Seoul': 'KST',
                'Australia/Sydney': 'AEDT'
            };
            
            const abbr = timezoneAbbreviations[this.timezone] || 'GMT';
            
            // Replace timezone in string
            return str.replace(/GMT[+-]\d{4} \([^)]+\)/, `GMT${this.getOffsetString()} (${abbr})`);
        },

        getOffsetString() {
            const offset = -this.timezoneOffset; // Convert to hours from UTC
            const hours = Math.floor(Math.abs(offset) / 60);
            const minutes = Math.abs(offset) % 60;
            const sign = offset >= 0 ? '+' : '-';
            
            return `${sign}${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}`;
        },

        maskAsNative(func, name) {
            func.toString = function() {
                return `function ${name}() { [native code] }`;
            };
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TimezoneInterceptor;
    } else {
        window.TimezoneInterceptor = TimezoneInterceptor;
    }
})();
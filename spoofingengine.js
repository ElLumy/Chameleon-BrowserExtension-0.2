/**
 * Spoofing Engine
 * Central engine that generates coherent device profiles based on seed
 */

(function() {
    'use strict';

    const SpoofingEngine = {
        profiles: null,
        currentProfile: null,
        seedManager: null,
        
        async init() {
            // Load profiles data
            await this.loadProfiles();
            
            // Initialize seed manager
            this.seedManager = window.SeedManager || SeedManager;
            
            // Generate profile for current session
            this.currentProfile = this.generateProfile();
            
            return this.currentProfile;
        },

        async loadProfiles() {
            try {
                // Try to fetch profiles.json
                const response = await fetch(chrome.runtime.getURL('profiles.json'));
                const data = await response.json();
                this.profiles = data.deviceArchetypes;
            } catch (e) {
                console.warn('Failed to load profiles.json, using defaults');
                this.profiles = this.getDefaultProfiles();
            }
        },

        generateProfile() {
            const seed = this.seedManager.getSeed();
            
            // Select a device archetype based on weights
            const archetype = this.selectArchetype();
            
            // Build complete profile from archetype
            const profile = {
                seed: seed,
                archetype: archetype.name,
                os: this.selectOS(archetype),
                hardware: this.selectHardware(archetype),
                display: this.selectDisplay(archetype),
                locale: this.selectLocale(archetype),
                fonts: archetype.fonts || [],
                userAgent: this.buildUserAgent(archetype),
                navigator: {},
                webgl: {},
                audio: {},
                battery: {}
            };
            
            // Build navigator properties
            profile.navigator = this.buildNavigatorProfile(profile);
            
            // Build WebGL properties
            profile.webgl = this.buildWebGLProfile(profile);
            
            // Build audio properties
            profile.audio = this.buildAudioProfile(profile);
            
            // Build battery properties
            profile.battery = this.buildBatteryProfile(profile);
            
            return profile;
        },

        selectArchetype() {
            const archetypes = this.profiles;
            const weights = archetypes.map(a => a.weight || 0.1);
            
            return this.seedManager.randomWeightedChoice(archetypes, weights, 0);
        },

        selectOS(archetype) {
            const osOptions = Object.keys(archetype.os || {});
            const osWeights = Object.values(archetype.os || {});
            
            const osName = this.seedManager.randomWeightedChoice(osOptions, osWeights, 1);
            
            return {
                name: osName,
                platform: archetype.platform
            };
        },

        selectHardware(archetype) {
            const hw = archetype.hardware || {};
            const hardware = {};
            
            // Select CPU
            if (hw.cpu) {
                const cpuOptions = Object.keys(hw.cpu);
                const cpuWeights = Object.values(hw.cpu);
                hardware.cpu = this.seedManager.randomWeightedChoice(cpuOptions, cpuWeights, 2);
                
                // Determine core count based on CPU
                hardware.hardwareConcurrency = this.getCoreCount(hardware.cpu);
            }
            
            // Select RAM
            if (hw.ram) {
                const ramOptions = Object.keys(hw.ram).map(Number);
                const ramWeights = Object.values(hw.ram);
                hardware.deviceMemory = this.seedManager.randomWeightedChoice(ramOptions, ramWeights, 3);
            }
            
            // Select GPU
            if (hw.gpu) {
                const gpuOptions = Object.keys(hw.gpu);
                const gpuWeights = Object.values(hw.gpu);
                const gpuModel = this.seedManager.randomWeightedChoice(gpuOptions, gpuWeights, 4);
                
                hardware.gpu = this.parseGPU(gpuModel);
            }
            
            return hardware;
        },

        getCoreCount(cpu) {
            // Determine logical core count based on CPU model
            if (!cpu) return 4;
            
            const cpuLower = cpu.toLowerCase();
            
            if (cpuLower.includes('i9') || cpuLower.includes('ryzen 9') || cpuLower.includes('threadripper')) {
                return this.seedManager.randomChoice([16, 20, 24, 32], 10);
            } else if (cpuLower.includes('i7') || cpuLower.includes('ryzen 7')) {
                return this.seedManager.randomChoice([8, 12, 16], 11);
            } else if (cpuLower.includes('i5') || cpuLower.includes('ryzen 5')) {
                return this.seedManager.randomChoice([6, 8, 12], 12);
            } else if (cpuLower.includes('i3') || cpuLower.includes('ryzen 3')) {
                return this.seedManager.randomChoice([4, 6], 13);
            } else if (cpuLower.includes('m1') || cpuLower.includes('m2') || cpuLower.includes('m3')) {
                return 8; // Apple Silicon
            } else if (cpuLower.includes('celeron') || cpuLower.includes('pentium')) {
                return this.seedManager.randomChoice([2, 4], 14);
            }
            
            return 4; // Default
        },

        parseGPU(gpuModel) {
            // Extract vendor and model from GPU string
            const vendors = ['NVIDIA', 'AMD', 'Intel', 'Apple'];
            let vendor = 'Intel';
            let model = gpuModel;
            
            for (const v of vendors) {
                if (gpuModel.includes(v)) {
                    vendor = v;
                    break;
                }
            }
            
            return { vendor, model };
        },

        selectDisplay(archetype) {
            const display = archetype.display || {};
            
            const resolution = this.seedManager.randomChoice(display.resolutions || ['1920x1080'], 5);
            
            return {
                resolution: resolution,
                colorDepth: display.colorDepth || 24,
                pixelDepth: display.pixelDepth || 24,
                maxTouchPoints: display.maxTouchPoints || 0
            };
        },

        selectLocale(archetype) {
            const locale = archetype.locale || {};
            const languages = locale.languages || ['en-US'];
            
            return {
                language: languages[0],
                languages: languages
            };
        },

        buildUserAgent(archetype) {
            let userAgent = archetype.userAgent || navigator.userAgent;
            
            // Replace Chrome version placeholder
            const chromeVersion = this.seedManager.randomChoice(
                ['120.0.6099.130', '121.0.6167.85', '122.0.6261.69', '123.0.6312.86'],
                6
            );
            
            userAgent = userAgent.replace('{CHROME_VERSION}', chromeVersion);
            
            return userAgent;
        },

        buildNavigatorProfile(profile) {
            const nav = {
                userAgent: profile.userAgent,
                platform: profile.os.platform,
                language: profile.locale.language,
                languages: profile.locale.languages,
                hardwareConcurrency: profile.hardware.hardwareConcurrency || 4,
                deviceMemory: profile.hardware.deviceMemory || 8,
                maxTouchPoints: profile.display.maxTouchPoints || 0,
                vendor: this.getVendor(profile.os.name),
                appVersion: profile.userAgent.replace('Mozilla/', ''),
                plugins: [],
                mimeTypes: []
            };
            
            // Add plugins based on OS
            if (profile.os.name?.includes('Windows')) {
                nav.plugins = ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client'];
            }
            
            return nav;
        },

        getVendor(osName) {
            if (osName?.includes('macOS')) {
                return 'Apple Computer, Inc.';
            }
            return 'Google Inc.';
        },

        buildWebGLProfile(profile) {
            const gpu = profile.hardware.gpu || {};
            const os = profile.os || {};
            
            let renderer = 'ANGLE (';
            let vendor = 'Google Inc.';
            
            // Build renderer string based on OS and GPU
            if (os.name?.includes('Windows')) {
                if (gpu.vendor === 'NVIDIA') {
                    renderer += `NVIDIA, ${gpu.model} Direct3D11 vs_5_0 ps_5_0, D3D11)`;
                } else if (gpu.vendor === 'AMD') {
                    renderer += `AMD, ${gpu.model} Direct3D11 vs_5_0 ps_5_0, D3D11)`;
                } else {
                    renderer += `Intel, ${gpu.model} Direct3D11 vs_5_0 ps_5_0, D3D11)`;
                }
            } else if (os.name?.includes('macOS')) {
                vendor = 'Apple Inc.';
                renderer = `ANGLE (Apple, ANGLE Metal Renderer: ${gpu.model}, Unspecified Version)`;
            } else {
                // Linux
                renderer = `Mesa ${gpu.model}`;
            }
            
            return {
                vendor: vendor,
                renderer: renderer,
                version: 'WebGL 1.0',
                shadingLanguageVersion: 'WebGL GLSL ES 1.0'
            };
        },

        buildAudioProfile(profile) {
            // Generate consistent audio parameters
            const sampleRate = this.seedManager.randomChoice([44100, 48000], 7);
            const maxChannelCount = this.seedManager.randomChoice([2, 6], 8);
            
            return {
                sampleRate: sampleRate,
                maxChannelCount: maxChannelCount,
                state: 'running'
            };
        },

        buildBatteryProfile(profile) {
            // Determine if device likely has battery
            const hasBattery = profile.archetype.includes('Laptop') || 
                             profile.archetype.includes('Tablet') ||
                             profile.archetype.includes('2-in-1');
            
            if (hasBattery) {
                return {
                    charging: this.seedManager.random(9) > 0.3,
                    chargingTime: this.seedManager.randomInt(0, 7200, 10),
                    dischargingTime: this.seedManager.randomInt(3600, 28800, 11),
                    level: this.seedManager.random(12) * 0.8 + 0.2 // 20-100%
                };
            }
            
            // Desktop - always plugged in
            return {
                charging: true,
                chargingTime: 0,
                dischargingTime: Infinity,
                level: 1.0
            };
        },

        getDefaultProfiles() {
            // Minimal default profiles if profiles.json fails to load
            return [{
                name: 'Default Windows PC',
                weight: 1,
                platform: 'Win32',
                os: { 'Windows 11': 100 },
                hardware: {
                    cpu: { 'Intel Core i5': 100 },
                    ram: { '16': 100 },
                    gpu: { 'Intel Iris Xe Graphics': 100 }
                },
                display: {
                    resolutions: ['1920x1080'],
                    colorDepth: 24,
                    pixelDepth: 24,
                    maxTouchPoints: 0
                },
                locale: {
                    languages: ['en-US', 'en']
                },
                fonts: ['Arial', 'Calibri', 'Segoe UI', 'Tahoma', 'Verdana'],
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            }];
        },

        // Getter methods for interceptors
        getCurrentProfile() {
            if (!this.currentProfile) {
                this.currentProfile = this.generateProfile();
            }
            return this.currentProfile;
        },

        regenerateProfile() {
            this.seedManager.clearSeed();
            this.seedManager.generateSeed();
            this.currentProfile = this.generateProfile();
            return this.currentProfile;
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SpoofingEngine;
    } else {
        window.SpoofingEngine = SpoofingEngine;
    }
})();
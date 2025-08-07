# 🦎 Chameleon - Advanced Browser Fingerprint Spoofer

![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

## Overview

Chameleon is a sophisticated Chrome extension that provides advanced protection against browser fingerprinting techniques. It dynamically generates coherent device profiles per session, making tracking attempts ineffective while maintaining website compatibility.

## 🚀 Features

### Core Protection
- **Dynamic Profile Generation**: Creates unique, coherent device profiles for each browsing session
- **Per-Session Consistency**: Maintains the same spoofed values throughout a session to avoid detection
- **OS-Hardware Coherence**: Ensures logical consistency between OS, hardware, and browser properties
- **Real-time Fingerprint Detection**: Identifies and alerts when websites attempt fingerprinting

### Advanced Techniques
- **Canvas Noise**: Edge-based deterministic noise that mimics natural rendering artifacts
- **WebGL Spoofing**: Coherent GPU/renderer strings matching the OS profile
- **Audio Context Protection**: Adds subtle variations to audio fingerprinting
- **Font Detection Control**: Limits detected fonts to match the spoofed OS
- **Timezone Synchronization**: Aligns timezone with expected geolocation
- **API Timing Jitter**: Adds Gaussian-distributed delays to mimic real hardware

### Intercepted APIs
- Navigator properties (userAgent, platform, hardware, memory)
- Screen dimensions and color depth
- Canvas and WebGL operations
- Audio context and analysis
- Font measurements
- Plugin and MIME type arrays
- Battery status
- Timezone and locale information

## 📦 Installation

### Development Installation

1. **Clone or download** this repository:
```bash
git clone https://github.com/ellumy/chameleon.git
cd chameleon
```

2. **Open Chrome Extension Management**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load the extension**:
   - Click "Load unpacked"
   - Select the `chameleon` directory

4. **Verify installation**:
   - You should see the Chameleon icon in your extension toolbar
   - Click it to access the control panel

## 🎮 Usage

### Basic Operation

1. **Click the Chameleon icon** in your toolbar to open the control panel
2. **View your current profile**: See the spoofed OS, browser, and session ID
3. **Generate new profile**: Click "Generate New Profile" to rotate your fingerprint
4. **Monitor detection**: The extension will alert you when fingerprinting is detected

### Settings

- **Auto-Rotate Profile**: Automatically generate new profiles at set intervals
- **Debug Mode**: Enable console logging for troubleshooting
- **Export Settings**: Save your configuration and statistics

### Profile Information

Each generated profile includes:
- Operating System (Windows/macOS/Linux)
- Hardware specs (CPU cores, RAM, GPU)
- Screen resolution and color depth
- Browser configuration
- Timezone and locale
- System fonts

## 🧪 Testing Your Protection

### Recommended Testing Sites

1. **BrowserLeaks**: https://browserleaks.com/canvas
2. **AmIUnique**: https://amiunique.org/
3. **Panopticlick**: https://panopticlick.eff.org/
4. **CreepJS**: https://abrahamjuliot.github.io/creepjs/
5. **FingerprintJS Demo**: https://fingerprintjs.github.io/fingerprintjs/

### What to Look For

- ✅ Different fingerprints across sessions
- ✅ Coherent device profiles (no impossible combinations)
- ✅ Consistent values within the same session
- ✅ No detection of spoofing/lying

## 🔧 Technical Details

### Architecture

```
chameleon/
├── manifest.json           # Extension configuration
├── background.js          # Service worker for profile management
├── content_script.js      # Main injection script
├── spoofingEngine.js      # Profile generation engine
├── seedManager.js         # Deterministic seed generation
├── profiles.json          # Device archetype database
├── interceptors/          # API interceptor modules
│   ├── navigatorInterceptor.js
│   ├── canvasInterceptor.js
│   ├── webglInterceptor.js
│   ├── audioInterceptor.js
│   ├── fontsInterceptor.js
│   ├── screenInterceptor.js
│   ├── pluginsInterceptor.js
│   ├── timezoneInterceptor.js
│   └── metaInterceptor.js
└── utils/                 # Utility modules
    ├── randomUtils.js
    ├── hashUtils.js
    ├── jitterUtils.js
    └── detectionUtils.js
```

### Key Technologies

- **Manifest V3**: Latest Chrome extension architecture
- **ES6 Proxies**: For transparent API interception
- **Deterministic Seeding**: Consistent per-session values
- **Box-Muller Transform**: Gaussian distribution for realistic timing
- **Edge Detection**: Sobel operator for canvas noise placement

### Profile Generation Process

1. **Seed Generation**: Cryptographically secure random seed per session
2. **Archetype Selection**: Weighted selection from device profiles
3. **Property Derivation**: All values derived deterministically from seed
4. **Consistency Enforcement**: OS → Hardware → Software chain
5. **API Interception**: Real-time value substitution

## ⚠️ Important Notes

### Limitations

- Some websites may break if they depend on specific fingerprint values
- Cannot protect against IP-based tracking (use VPN/proxy)
- Advanced anti-bot systems may still detect automation
- WebRTC IP leaks are not addressed (disable WebRTC separately)

### Best Practices

1. **Use with VPN/Proxy**: Match your IP location with the spoofed timezone
2. **Regular Profile Rotation**: Enable auto-rotate for maximum protection
3. **Monitor Detection Warnings**: Some sites may require disabling protection
4. **Clear Cookies**: Fingerprinting is often combined with cookie tracking

## 🛠️ Development

### Building from Source

```bash
# Install dependencies (if any)
npm install

# Run tests
npm test

# Build for production
npm run build
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📊 Performance Impact

- **CPU Usage**: ~1-3% during page load
- **Memory**: ~20-30MB
- **Page Load**: +50-200ms (due to API interception)
- **Runtime**: Negligible after initialization

## 🔒 Privacy Policy

Chameleon:
- ✅ Runs entirely locally
- ✅ No data collection or transmission
- ✅ No external servers or analytics
- ✅ Open source and auditable

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by the research on browser fingerprinting countermeasures
- Based on techniques from Brave Browser's farbling mechanism
- Canvas noise implementation adapted from academic research
- Community contributions and testing

## 📮 Support

- **Issues**: https://github.com/ellumy/chameleon/issues
- **Discussions**: https://github.com/ellumy/chameleon/discussions
- **Wiki**: https://github.com/yourusername/ellumy/wiki

## 🔄 Changelog

### Version 0.2.0 (2025-01-27)
- Initial release
- Core fingerprinting protection
- Dynamic profile generation
- Real-time detection system
- Comprehensive API coverage

---

**Remember**: Chameleon is a privacy tool. Always respect website terms of service and local laws when using fingerprint spoofing technology.

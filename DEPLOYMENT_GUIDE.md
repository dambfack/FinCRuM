# FinCRuM Desktop Deployment Guide

This guide explains how to build and deploy FinCRuM as a desktop application with installers for Windows, macOS, and Linux.

## Prerequisites

### Required Software
- Node.js 18+ and npm
- Python 3.8+ (for backend components)
- Git

### Platform-Specific Requirements

#### Windows
- Windows 10/11
- No additional requirements for building Windows installers

#### macOS
- macOS 10.15+ (for building)
- Xcode Command Line Tools
- Apple Developer account (for code signing - optional)

#### Linux
- Ubuntu 18.04+ or equivalent
- `fpm` gem for building packages: `gem install fpm`

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Application
```bash
# Build for current platform (Windows by default)
npm run build:installer

# Or build for specific platform
npm run build:installer:win    # Windows
npm run build:installer:mac    # macOS
npm run build:installer:linux  # Linux
npm run build:installer:all    # All platforms
```

### 3. Find Your Installer
Built installers will be in the `dist/` directory:
- **Windows**: `.exe` (NSIS installer) and `.exe` (portable)
- **macOS**: `.dmg` (disk image) and `.zip` (archive)
- **Linux**: `.AppImage`, `.deb`, and `.rpm` packages

## Detailed Build Process

### Step 1: Prepare Application Icons

The build process requires application icons in multiple formats:

1. **Source Icon**: `assets/icon.svg` (already created)
2. **Required Formats**:
   - `assets/icon.png` (512x512) - Linux
   - `assets/icon.ico` (256x256) - Windows
   - `assets/icon.icns` (512x512) - macOS

#### Generate Icons
You can use online converters or tools like:
```bash
# Using electron-icon-builder (optional)
npm install -g electron-icon-builder
electron-icon-builder --input=assets/icon.svg --output=assets/
```

### Step 2: Build Next.js Application
```bash
npm run electron:build
```
This creates the `out/` directory with the static Next.js build.

### Step 3: Build Electron Installer
```bash
# Windows (creates NSIS installer and portable exe)
npm run dist:win

# macOS (creates DMG and ZIP)
npm run dist:mac

# Linux (creates AppImage, DEB, and RPM)
npm run dist:linux

# All platforms
npm run dist
```

## Configuration

### Electron Builder Configuration
The build configuration is in `package.json` under the `build` section:

```json
{
  "build": {
    "appId": "com.fincrm.app",
    "productName": "FinCRuM",
    "directories": {
      "output": "dist"
    }
  }
}
```

### Customizing Installers

#### Windows (NSIS)
- **One-click install**: Set `"oneClick": true` in `nsis` config
- **Custom install directory**: Current config allows user choice
- **Desktop shortcut**: Automatically created
- **Start menu**: Automatically created

#### macOS (DMG)
- **Background image**: Add `assets/dmg-background.png`
- **Window size**: Configurable in `dmg.window`
- **Icon positioning**: Configurable in `dmg.contents`

#### Linux
- **AppImage**: Portable, no installation required
- **DEB**: For Debian/Ubuntu systems
- **RPM**: For Red Hat/Fedora systems

## Code Signing (Production)

### Windows
```json
{
  "win": {
    "certificateFile": "path/to/certificate.p12",
    "certificatePassword": "password",
    "signingHashAlgorithms": ["sha256"]
  }
}
```

### macOS
```json
{
  "mac": {
    "identity": "Developer ID Application: Your Name",
    "hardenedRuntime": true,
    "entitlements": "build/entitlements.mac.plist"
  }
}
```

## Auto-Updates (Optional)

To enable auto-updates, configure electron-updater:

```json
{
  "publish": {
    "provider": "github",
    "owner": "your-username",
    "repo": "FinCRuM"
  }
}
```

## Troubleshooting

### Common Issues

#### Build Fails on Windows
- Ensure Windows SDK is installed
- Run as Administrator if permission issues occur
- Check antivirus isn't blocking the build

#### Build Fails on macOS
- Install Xcode Command Line Tools: `xcode-select --install`
- Ensure sufficient disk space (>5GB)

#### Build Fails on Linux
- Install required packages: `sudo apt-get install build-essential`
- For RPM builds: `sudo apt-get install rpm`

#### Large Installer Size
- The installer includes Node.js runtime and dependencies
- Typical size: 150-300MB depending on platform
- Use `npm run pack` to create unpacked directory for testing

### Debug Build Process
```bash
# Enable verbose logging
DEBUG=electron-builder npm run dist:win

# Build without packaging (faster for testing)
npm run pack
```

## Distribution

### Local Distribution
1. Build installers using the commands above
2. Test on clean systems
3. Distribute via USB, network share, or download

### Online Distribution
1. Upload to GitHub Releases
2. Use CDN for faster downloads
3. Provide checksums for verification

### Enterprise Distribution
1. Use MSI for Windows enterprise deployment
2. Create custom installation scripts
3. Consider silent installation options

## Security Considerations

1. **Code Signing**: Always sign production builds
2. **Updates**: Use secure update channels
3. **Permissions**: Application runs with user permissions
4. **Data**: Local data stored in user directory
5. **Network**: Ensure HTTPS for all external connections

## Performance Optimization

1. **Bundle Size**: Exclude unnecessary files in build config
2. **Startup Time**: Optimize Electron main process
3. **Memory Usage**: Monitor and optimize React components
4. **Disk Space**: Clean up temporary files

## Support

For build issues:
1. Check the build logs in the console
2. Verify all dependencies are installed
3. Ensure sufficient disk space and permissions
4. Test on a clean system before distribution

---

**Note**: The first build may take longer as it downloads platform-specific binaries. Subsequent builds will be faster.
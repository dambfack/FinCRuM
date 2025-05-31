const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const runCommand = (command, description) => {
  log(`${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    log(`✅ ${description} completed successfully`);
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`);
    process.exit(1);
  }
};

const cleanupDist = () => {
  log('Cleaning up previous build artifacts...');
  const distDir = path.join(__dirname, 'dist');
  
  if (fs.existsSync(distDir)) {
    try {
      // Try multiple cleanup strategies
      log('Attempting to remove dist directory...');
      
      // First, try to rename the directory to release locks
      const tempDir = path.join(__dirname, `dist-cleanup-${Date.now()}`);
      try {
        fs.renameSync(distDir, tempDir);
        log('✅ Renamed dist directory for cleanup');
        
        // Schedule deletion after a short delay
        setTimeout(() => {
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
            log('✅ Cleanup completed');
          } catch (err) {
            log(`⚠️ Background cleanup failed: ${err.message}`);
          }
        }, 1000);
        
      } catch (renameError) {
        log(`⚠️ Could not rename dist directory: ${renameError.message}`);
        log('Proceeding with build anyway...');
      }
      
    } catch (error) {
      log(`⚠️ Cleanup failed: ${error.message}`);
      log('Proceeding with build anyway...');
    }
  } else {
    log('✅ No previous build artifacts found');
  }
};

const checkRequirements = () => {
  log('Checking build requirements...');
  
  // Always rebuild Next.js for production to ensure latest changes
  log('🔨 Building Next.js production build...');
  runCommand('npm run build', 'Building Next.js production application');
  
  // Check if Next.js build exists after building
  const nextBuildDir = path.join(__dirname, '.next');
  if (!fs.existsSync(nextBuildDir)) {
    log('❌ Next.js build failed - .next directory not found');
    process.exit(1);
  } else {
    log('✅ Next.js production build completed');
  }
  
  // Check if assets directory exists
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    log('❌ Assets directory not found');
    process.exit(1);
  } else {
    log('✅ Assets directory found');
  }
  
  // Verify package.json exists
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    log('❌ package.json not found');
    process.exit(1);
  } else {
    log('✅ package.json found');
  }
  
  // Check if loading.html exists
  const loadingHtmlPath = path.join(__dirname, 'loading.html');
  if (!fs.existsSync(loadingHtmlPath)) {
    log('❌ loading.html not found');
    process.exit(1);
  } else {
    log('✅ loading.html found');
  }
};

const generateIcons = () => {
  log('Generating application icons...');
  
  // For now, we'll copy the SVG as PNG for basic functionality
  // In a real scenario, you'd use a tool like electron-icon-builder
  const svgPath = path.join(__dirname, 'assets', 'icon.svg');
  const pngPath = path.join(__dirname, 'assets', 'icon.png');
  
  if (fs.existsSync(svgPath) && !fs.existsSync(pngPath)) {
    log('⚠️  SVG icon found but PNG not generated. Please convert icon.svg to:');
    log('   - icon.png (512x512) for Linux');
    log('   - icon.ico (256x256) for Windows');
    log('   - icon.icns (512x512) for macOS');
    log('   You can use online converters or tools like electron-icon-builder');
  }
};

const buildForPlatform = (platform) => {
  const platformCommands = {
    'win': 'npm run dist:win',
    'mac': 'npm run dist:mac',
    'linux': 'npm run dist:linux',
    'all': 'npm run dist'
  };
  
  const command = platformCommands[platform];
  if (!command) {
    log(`❌ Unknown platform: ${platform}`);
    log('Available platforms: win, mac, linux, all');
    process.exit(1);
  }
  
  runCommand(command, `Building installer for ${platform}`);
};

const main = () => {
  const args = process.argv.slice(2);
  const platform = args[0] || 'win'; // Default to Windows
  
  log('🚀 Starting FinCRuM installer build process...');
  log('📋 FinCRuM - Finsculpt Client ResoUrce Management');
  log(`Target platform: ${platform}`);
  log('');
  log('📝 Build includes:');
  log('   - Next.js production build');
  log('   - Electron frontend with loading screen');
  log('   - Automatic production server startup');
  log('   - All required dependencies');
  log('');
  
  cleanupDist();
  checkRequirements();
  generateIcons();
  buildForPlatform(platform);
  
  log('🎉 Build process completed!');
  log('📦 Installers can be found in the "dist" directory');
  log('');
  log('🔧 Installation will include:');
  log('   - FinCRuM desktop application');
  log('   - Built-in Next.js production server');
  log('   - Loading screen with server startup detection');
  log('   - All necessary Node.js dependencies');
  log('');
  log('🚀 After installation, users can:');
  log('   - Launch FinCRuM from desktop shortcut');
  log('   - App automatically starts local server on port 9002');
  log('   - Loading screen waits for server to be ready');
  log('   - Main application loads when server is available');
  
  // Show build artifacts
  const distDir = path.join(__dirname, 'dist');
  if (fs.existsSync(distDir)) {
    log('\n📋 Build artifacts:');
    const files = fs.readdirSync(distDir);
    files.forEach(file => {
      const filePath = path.join(distDir, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      log(`   - ${file} (${size} MB)`);
    });
  }
};

if (require.main === module) {
  main();
}

module.exports = { main, buildForPlatform, checkRequirements };
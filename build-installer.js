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

const checkRequirements = () => {
  log('Checking build requirements...');
  
  // Check if Next.js build exists
  const nextBuildDir = path.join(__dirname, '.next');
  if (!fs.existsSync(nextBuildDir)) {
    log('❌ Next.js build not found. Running build first...');
    runCommand('npm run electron:build', 'Building Next.js application');
  } else {
    log('✅ Next.js build found');
  }
  
  // Check if assets directory exists
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    log('❌ Assets directory not found');
    process.exit(1);
  } else {
    log('✅ Assets directory found');
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
  log(`Target platform: ${platform}`);
  
  checkRequirements();
  generateIcons();
  buildForPlatform(platform);
  
  log('🎉 Build process completed!');
  log('📦 Installers can be found in the "dist" directory');
  
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
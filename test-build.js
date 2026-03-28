#!/usr/bin/env node

/**
 * Simple test script to verify the Weather Alert Bot project builds correctly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Weather Alert Bot - Build Test');
console.log('=' .repeat(50));

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.error('❌ node_modules directory not found. Run npm install first.');
  process.exit(1);
}

console.log('✅ node_modules directory exists');

// Check if TypeScript is installed
try {
  const tscVersion = execSync('npx tsc --version', { encoding: 'utf-8' });
  console.log(`✅ TypeScript installed: ${tscVersion.trim()}`);
} catch (error) {
  console.error('❌ TypeScript not installed or not accessible');
  process.exit(1);
}

// Check required configuration files
const requiredFiles = [
  'config.json',
  'package.json',
  'tsconfig.json',
  'src/index.ts'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.error(`❌ ${file} not found`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('❌ Missing required files');
  process.exit(1);
}

// Try to compile TypeScript
console.log('\n🔨 Attempting TypeScript compilation...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful (no errors)');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  console.error('Error details:', error.message);
  process.exit(1);
}

// Check if dist directory can be created
console.log('\n🏗️  Attempting full build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  
  // Check if dist directory was created
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    console.log(`✅ Build successful! Created ${files.length} files in dist/`);
    
    // Check for key output files
    const keyFiles = ['index.js', 'dashboard/server.js', 'services/weatherAggregator.js'];
    let missingFiles = [];
    
    for (const keyFile of keyFiles) {
      const filePath = path.join(distPath, keyFile);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(keyFile);
      }
    }
    
    if (missingFiles.length > 0) {
      console.warn(`⚠️  Some expected files not found: ${missingFiles.join(', ')}`);
    } else {
      console.log('✅ All key output files generated');
    }
  } else {
    console.error('❌ dist directory not created after build');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Build failed');
  console.error('Error:', error.message);
  process.exit(1);
}

// Test the configuration
console.log('\n⚙️  Testing configuration...');
try {
  const config = require('./config.json');
  
  // Check required config sections
  const requiredSections = ['app', 'apis', 'cache', 'alerts', 'whatsapp'];
  let configValid = true;
  
  for (const section of requiredSections) {
    if (!config[section]) {
      console.error(`❌ Missing config section: ${section}`);
      configValid = false;
    }
  }
  
  if (configValid) {
    console.log('✅ Configuration structure is valid');
    
    // Check API configurations
    const apis = config.apis || {};
    const enabledApis = Object.keys(apis).filter(key => apis[key]?.enabled);
    console.log(`✅ ${enabledApis.length} weather APIs enabled: ${enabledApis.join(', ')}`);
    
    // Check users
    const users = config.users || [];
    console.log(`✅ ${users.length} users configured`);
    
    if (users.length > 0) {
      console.log(`   Sample user: ${users[0].id} (${users[0].whatsappNumber})`);
    }
  } else {
    console.error('❌ Configuration validation failed');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Failed to load or parse config.json');
  console.error('Error:', error.message);
  process.exit(1);
}

console.log('\n' + '=' .repeat(50));
console.log('🎉 All tests passed! The Weather Alert Bot is ready to run.');
console.log('\nNext steps:');
console.log('1. Update API keys in config.json if needed');
console.log('2. Run the bot: npm start');
console.log('3. Access dashboard: http://localhost:3000');
console.log('4. Scan QR code with WhatsApp when prompted');
console.log('=' .repeat(50));
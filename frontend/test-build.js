#!/usr/bin/env node

/**
 * Comprehensive Testing Script
 * Tests TypeScript compilation, imports, and runtime bundling
 */

const { execSync } = require('child_process');
const fs = require('fs');

function runCommand(command, description) {
  console.log(`🔍 ${description}...`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      timeout: 60000 // 60 second timeout
    });
    console.log(`✅ ${description} - PASSED`);
    return { success: true, output };
  } catch (error) {
    console.log(`❌ ${description} - FAILED`);
    console.log('Error output:', error.stdout || error.stderr || error.message);
    return { success: false, error: error.stdout || error.stderr || error.message };
  }
}

function main() {
  console.log('🚀 Running comprehensive build and validation tests...\n');
  
  const tests = [
    {
      command: 'node validate-imports.js',
      description: 'Validating imports'
    },
    {
      command: 'npm run type-check',
      description: 'TypeScript compilation check'
    },
    {
      command: 'npm run lint',
      description: 'ESLint validation'
    },
    {
      command: 'npx react-native bundle --platform android --dev false --entry-file index.ts --bundle-output test-bundle.js --reset-cache',
      description: 'Android bundle creation test'
    }
  ];
  
  let allPassed = true;
  const results = [];
  
  for (const test of tests) {
    const result = runCommand(test.command, test.description);
    results.push({ ...test, ...result });
    
    if (!result.success) {
      allPassed = false;
    }
    
    console.log(); // Add spacing
  }
  
  // Clean up test bundle
  try {
    if (fs.existsSync('test-bundle.js')) {
      fs.unlinkSync('test-bundle.js');
      console.log('🧹 Cleaned up test bundle file');
    }
  } catch (e) {
    // Ignore cleanup errors
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.description}`);
  }
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! The app should run without errors.');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Please fix the issues above before deploying.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
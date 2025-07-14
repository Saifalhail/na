#!/usr/bin/env node

// Simple Node.js script to test API connectivity
const http = require('http');

const testUrls = [
  'http://127.0.0.1:8000/api/v1/health/',
  'http://172.25.29.233:8000/api/v1/health/',
  'http://10.0.2.2:8000/api/v1/health/',
];

console.log('🔍 Testing API connectivity from host machine...\n');

testUrls.forEach((url, index) => {
  const urlObj = new URL(url);
  
  console.log(`${index + 1}. Testing: ${url}`);
  
  const req = http.request({
    hostname: urlObj.hostname,
    port: urlObj.port || 80,
    path: urlObj.pathname,
    method: 'GET',
    timeout: 5000,
  }, (res) => {
    console.log(`   ✅ Success: ${res.statusCode} ${res.statusMessage}`);
  });
  
  req.on('error', (err) => {
    console.log(`   ❌ Failed: ${err.message}`);
  });
  
  req.on('timeout', () => {
    console.log(`   ⏰ Timeout: Request timed out after 5 seconds`);
    req.destroy();
  });
  
  req.end();
});

console.log('\n💡 Notes:');
console.log('- 127.0.0.1 should work from the host machine');
console.log('- 172.25.29.233 is your WSL IP (should work from Android emulator)');
console.log('- 10.0.2.2 is the Android emulator default (may not work in WSL)');
#!/usr/bin/env node

/**
 * Import Validation Script
 * Validates that all responsive utility functions are properly imported
 */

const fs = require('fs');
const path = require('path');

// Functions from @/utils/responsive that need to be imported when used
const RESPONSIVE_FUNCTIONS = {
  'fontScale(': 'fontScale',
  'moderateScale(': 'moderateScale', 
  'scale(': 'scale',
  'verticalScale(': 'verticalScale',
  'rs.': 'rs',
  'rTouchTarget.': 'rTouchTarget',
  'layout.': 'layout',
  'dimensions.': 'dimensions',
  'zIndex.': 'zIndex'
};

const IMPORT_PATTERN = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/utils\/responsive['"]/;

function getAllTsxFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        traverse(fullPath);
      } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Skip the responsive.ts file itself to avoid circular import detection
  if (filePath.includes('src/utils/responsive.ts')) {
    return issues;
  }
  
  // Find used responsive functions
  const usedFunctions = new Set();
  for (const [pattern, functionName] of Object.entries(RESPONSIVE_FUNCTIONS)) {
    if (content.includes(pattern)) {
      usedFunctions.add(functionName);
    }
  }
  
  if (usedFunctions.size === 0) {
    return issues; // No responsive functions used
  }
  
  // Check imports
  const importMatch = content.match(IMPORT_PATTERN);
  const importedFunctions = new Set();
  
  if (importMatch) {
    const imports = importMatch[1]
      .split(',')
      .map(imp => imp.trim())
      .filter(imp => imp.length > 0);
    
    imports.forEach(imp => importedFunctions.add(imp));
  }
  
  // Check for missing imports
  for (const usedFunction of usedFunctions) {
    if (!importedFunctions.has(usedFunction)) {
      issues.push({
        file: filePath,
        issue: `Missing import: ${usedFunction}`,
        used: Array.from(usedFunctions),
        imported: Array.from(importedFunctions)
      });
    }
  }
  
  return issues;
}

function main() {
  console.log('🔍 Validating responsive utility imports...\n');
  
  const srcDir = path.join(__dirname, 'src');
  const files = getAllTsxFiles(srcDir);
  
  let totalIssues = 0;
  const allIssues = [];
  
  for (const file of files) {
    const issues = validateFile(file);
    if (issues.length > 0) {
      totalIssues += issues.length;
      allIssues.push(...issues);
    }
  }
  
  if (totalIssues === 0) {
    console.log('✅ All responsive utility imports are valid!');
    process.exit(0);
  } else {
    console.log(`❌ Found ${totalIssues} import issues:\n`);
    
    for (const issue of allIssues) {
      console.log(`File: ${issue.file}`);
      console.log(`Issue: ${issue.issue}`);
      console.log(`Used functions: ${issue.used.join(', ')}`);
      console.log(`Imported functions: ${issue.imported.join(', ')}`);
      console.log('---');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
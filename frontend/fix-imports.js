#!/usr/bin/env node

/**
 * Automatic Import Fixer Script
 * Fixes missing responsive utility imports in TypeScript/TSX files
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
  'zIndex.': 'zIndex',
  'borderRadius.': 'borderRadius',
  'animationDuration.': 'animationDuration'
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

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip the responsive.ts file itself to avoid circular imports
  if (filePath.includes('src/utils/responsive.ts')) {
    return null;
  }
  
  // Find used responsive functions
  const usedFunctions = new Set();
  for (const [pattern, functionName] of Object.entries(RESPONSIVE_FUNCTIONS)) {
    if (content.includes(pattern)) {
      usedFunctions.add(functionName);
    }
  }
  
  if (usedFunctions.size === 0) {
    return null; // No responsive functions used
  }
  
  // Check current imports
  const importMatch = content.match(IMPORT_PATTERN);
  const importedFunctions = new Set();
  
  if (importMatch) {
    const imports = importMatch[1]
      .split(',')
      .map(imp => imp.trim())
      .filter(imp => imp.length > 0);
    
    imports.forEach(imp => importedFunctions.add(imp));
  }
  
  // Find missing imports
  const missingImports = [];
  for (const usedFunction of usedFunctions) {
    if (!importedFunctions.has(usedFunction)) {
      missingImports.push(usedFunction);
    }
  }
  
  return {
    content,
    usedFunctions: Array.from(usedFunctions),
    importedFunctions: Array.from(importedFunctions),
    missingImports,
    hasExistingImport: !!importMatch,
    existingImportLine: importMatch ? importMatch[0] : null
  };
}

function fixFileImports(filePath, analysis) {
  if (!analysis || analysis.missingImports.length === 0) {
    return false;
  }
  
  let { content } = analysis;
  const { missingImports, hasExistingImport, importedFunctions, existingImportLine } = analysis;
  
  if (hasExistingImport && existingImportLine) {
    // Update existing import
    const allImports = [...new Set([...importedFunctions, ...missingImports])].sort();
    const newImportLine = `import { ${allImports.join(', ')} } from '@/utils/responsive';`;
    content = content.replace(IMPORT_PATTERN, newImportLine);
  } else {
    // Add new import
    const allImports = [...new Set(missingImports)].sort();
    const newImportLine = `import { ${allImports.join(', ')} } from '@/utils/responsive';`;
    
    // Find the best place to insert the import
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Look for other imports to insert after
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') && line.includes('from ')) {
        insertIndex = i + 1;
      } else if (line && !line.startsWith('import') && !line.startsWith('/**') && !line.startsWith('*') && !line.startsWith('//')) {
        break;
      }
    }
    
    lines.splice(insertIndex, 0, newImportLine);
    content = lines.join('\n');
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function main() {
  console.log('🔧 Automatically fixing responsive utility imports...\n');
  
  const srcDir = path.join(__dirname, 'src');
  const files = getAllTsxFiles(srcDir);
  
  let fixedFiles = 0;
  let totalIssuesFixed = 0;
  
  for (const file of files) {
    try {
      const analysis = analyzeFile(file);
      if (analysis && analysis.missingImports.length > 0) {
        const wasFixed = fixFileImports(file, analysis);
        if (wasFixed) {
          fixedFiles++;
          totalIssuesFixed += analysis.missingImports.length;
          console.log(`✅ Fixed ${analysis.missingImports.length} imports in: ${path.relative(__dirname, file)}`);
          console.log(`   Added: ${analysis.missingImports.join(', ')}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error fixing ${file}: ${error.message}`);
    }
  }
  
  if (fixedFiles === 0) {
    console.log('✅ No import issues found to fix!');
  } else {
    console.log(`\n🎉 Successfully fixed ${totalIssuesFixed} import issues in ${fixedFiles} files!`);
  }
}

if (require.main === module) {
  main();
}
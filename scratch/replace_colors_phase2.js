
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..', 'app');
let modifiedFilesCount = 0;
let remainingOranges = new Set();

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // 1. Replace 700, 800, 900
  content = content.replace(/(bg|text|border|ring|from|to|via|fill|stroke)-orange-(700|800|900)/g, '\-[var(--brand-primary)]');
  
  // 2. Replace 200, 300, 400
  content = content.replace(/(bg|text|border|ring|from|to|via|fill|stroke)-orange-(200|300|400)/g, '\-[rgba(var(--brand-primary-rgb),0.4)]');

  // 3. Replace all remaining shadow-orange-*
  content = content.replace(/shadow-orange-\d+/g, 'shadow-[rgba(var(--brand-primary-rgb),0.15)]');

  // Check for any remaining orange classes (e.g. orange-50, etc. that might have been missed if they use from/to/via)
  // Re-run phase 1 for from/to/via/fill/stroke just in case
  content = content.replace(/(from|to|via|fill|stroke)-orange-(500|600)/g, '\-[var(--brand-primary)]');
  content = content.replace(/(from|to|via|fill|stroke)-orange-(50|100)/g, '\-[rgba(var(--brand-primary-rgb),0.1)]');

  const match = content.match(/[a-z]+-orange-\d+/g);
  if (match) {
    match.forEach(m => remainingOranges.add(m));
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    modifiedFilesCount++;
    console.log('Modified:', filePath);
  }
}

processDirectory(rootDir);
console.log('\n--- REPORT ---');
console.log('Total files modified:', modifiedFilesCount);
console.log('Remaining orange classes found:', Array.from(remainingOranges).join(', '));


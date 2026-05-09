
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..', 'app');
let modifiedFilesCount = 0;
let otherOranges = new Set();

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

  // Replace orange-500 and orange-600
  content = content.replace(/(bg|text|border|ring|shadow)-orange-(500|600)/g, '\-[var(--brand-primary)]');
  
  // Replace orange-50 and orange-100 (mainly bg and border)
  content = content.replace(/(bg|border)-orange-(50|100)/g, '\-[rgba(var(--brand-primary-rgb),0.1)]');
  // for text-orange-50 or 100, might just make it dim or leave it. We will use the same logic if needed, but usually it's bg.
  content = content.replace(/(text|ring)-orange-(50|100)/g, '\-[rgba(var(--brand-primary-rgb),0.1)]');

  // Track other oranges
  const match = content.match(/(bg|text|border|ring|shadow)-orange-(\d+)/g);
  if (match) {
    match.forEach(m => otherOranges.add(m));
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
console.log('Other orange classes found (need manual review):', Array.from(otherOranges).join(', '));


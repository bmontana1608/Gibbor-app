
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

  // Final catch-all for any tailwind class ending with orange-\d+
  content = content.replace(/([a-z\-]+)-orange-(500|600|700|800|900)/g, '\-[var(--brand-primary)]');
  content = content.replace(/([a-z\-]+)-orange-(50|100|200|300|400)/g, '\-[rgba(var(--brand-primary-rgb),0.4)]');

  const match = content.match(/[a-z\-]+-orange-\d+/g);
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
console.log('\n--- FINAL REPORT ---');
console.log('Total files modified:', modifiedFilesCount);
console.log('Remaining orange classes found:', Array.from(remainingOranges).join(', '));


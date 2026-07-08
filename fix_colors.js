
const fs = require('fs');
const path = require('path');

function fixClasses(classNameStr) {
  let parts = classNameStr.split(/\s+/);
  return parts.map(p => {
    // Check if it's broken
    if (!p.includes('[var(--brand') && !p.includes('[rgba(var(--brand')) {
      return p;
    }

    // Is it a hover/dark variant?
    let prefix = '';
    if (p.includes(':')) {
      const idx = p.lastIndexOf(':');
      prefix = p.substring(0, idx + 1);
      p = p.substring(idx + 1);
    }

    let opacity = '';
    let m = p.match(/\/(\d+)$/);
    if (m) opacity = '/' + m[1];

    if (p.includes('rgba(var(--brand-primary-rgb),0.1)')) opacity = '/10';
    if (p.includes('rgba(var(--brand-primary-rgb),0.15)')) opacity = '/15';
    if (p.includes('rgba(var(--brand-primary-rgb),0.2)')) opacity = '/20';
    if (p.includes('rgba(var(--brand-primary-rgb),0.4)')) opacity = '/40';
    if (p.includes('rgba(var(--brand-primary-rgb),0.5)')) opacity = '/50';

    // Guess the utility (bg, text, border, ring)
    let utility = 'text'; // default
    if (p.includes('rgba')) {
       // usually rgba with 0.1 was used for background, 0.4 for borders
       utility = opacity === '/40' ? 'border' : 'bg';
    } else {
       // if we have 'bg-brand' before, we can't know easily without full context
       // but we'll try to guess based on standard tailwind usage
       // If opacity is small (5, 10, 20) for a solid var, it might be background or ring
       // If we don't know, we leave it as text for now
       // We'll refine below
    }

    return prefix + utility + '-brand' + opacity;
  }).join(' ');
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Manual explicit fixes for common patterns where context is clear
  content = content.replace(/ring-1\s+(?:hover:|dark:)?-\[var\(--brand-primary\)\]\/20/g, match => match.replace('-[var', 'ring-[var'));
  content = content.replace(/border-2\s+(?:hover:|dark:)?-\[var\(--brand-primary\)\]/g, match => match.replace('-[var', 'border-[var'));
  content = content.replace(/border\s+(?:hover:|dark:)?-\[var\(--brand-primary\)\]/g, match => match.replace('-[var', 'border-[var'));
  content = content.replace(/from-\[var\(--brand-primary\)\]/g, 'from-brand');
  content = content.replace(/to-\[var\(--brand-primary\)\]/g, 'to-brand');
  
  // Icon replacements (text)
  content = content.replace(/className=\x22([^\x22]*?w-\d+\s+h-\d+[^\x22]*?)-\[var\(--brand-primary\)\]/g, 'className=\x22-[var(--brand-primary)]');
  
  // Button/Badge replacements (bg)
  content = content.replace(/className=\x22([^\x22]*?px-\d+\s+py-\d+[^\x22]*?)-\[var\(--brand-primary\)\]/g, 'className=\x22-[var(--brand-primary)]');
  content = content.replace(/className=\x22([^\x22]*?p-\d+[^\x22]*?)-\[var\(--brand-primary\)\]/g, 'className=\x22-[var(--brand-primary)]');
  
  // Opacities usually bg
  content = content.replace(/-\[rgba\(var\(--brand-primary-rgb\),0\.1\)\]/g, 'bg-brand/10');
  content = content.replace(/-\[rgba\(var\(--brand-primary-rgb\),0\.15\)\]/g, 'bg-brand/15');
  content = content.replace(/-\[rgba\(var\(--brand-primary-rgb\),0\.2\)\]/g, 'bg-brand/20');
  content = content.replace(/-\[rgba\(var\(--brand-primary-rgb\),0\.4\)\]/g, 'border-brand/40');
  content = content.replace(/-\[var\(--brand-primary\)\]\/5/g, 'bg-brand/5');
  content = content.replace(/-\[var\(--brand-primary\)\]\/10/g, 'bg-brand/10');
  content = content.replace(/-\[var\(--brand-primary\)\]\/20/g, 'bg-brand/20');

  // Generic fallback: convert remaining -[var(--brand-primary)]
  // We'll just replace with 	ext-brand if missing, but g-brand if it has 	ext-white
  content = content.replace(/-\[var\(--brand-primary\)\]([^\x22]*?)text-white/g, 'bg-brand-white');
  content = content.replace(/-\[var\(--brand-primary\)\]/g, 'text-brand');

  // Clean up things we mapped to g-[var(--brand-primary)] in earlier steps
  content = content.replace(/bg-\[var\(--brand-primary\)\]/g, 'bg-brand');
  content = content.replace(/text-\[var\(--brand-primary\)\]/g, 'text-brand');
  content = content.replace(/border-\[var\(--brand-primary\)\]/g, 'border-brand');
  content = content.replace(/ring-\[var\(--brand-primary\)\]/g, 'ring-brand');

  // Replace any remaining hardcoded orange to dynamic brand
  content = content.replace(/text-orange-500/g, 'text-brand');
  content = content.replace(/bg-orange-500/g, 'bg-brand');
  content = content.replace(/bg-orange-50/g, 'bg-brand/10');
  content = content.replace(/border-orange-500/g, 'border-brand');
  content = content.replace(/border-orange-200/g, 'border-brand/40');
  content = content.replace(/text-orange-600/g, 'text-brand');
  content = content.replace(/text-orange-400/g, 'text-brand/80');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
  }
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        traverseDir(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

traverseDir('./app');
traverseDir('./components');


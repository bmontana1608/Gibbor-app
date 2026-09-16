const fs = require('fs');
const path = require('path');

const directoriesToScan = ['app', 'components'];
const searchPatterns = [
  { regex: /'gibbor'/g, replacement: "'default'" },
  { regex: /"gibbor"/g, replacement: '"default"' },
  { regex: /'Gibbor App'/g, replacement: "'Plataforma'" },
  { regex: /'EFD GIBBOR'/g, replacement: "'TU CLUB'" },
  { regex: /"EFD GIBBOR"/g, replacement: '"TU CLUB"' },
  { regex: /PROFE GIBBOR/g, replacement: "ENTRENADOR" },
  { regex: /GIBBOR POINTS/g, replacement: "PUNTOS" },
  { regex: /ASISTENTE GIBBOR APP/g, replacement: "ASISTENTE VIRTUAL" },
  { regex: /Alertas Gibbor/g, replacement: "Alertas del Club" },
  { regex: /Aviso Gibbor/g, replacement: "Nuevo Aviso" },
  { regex: /gibbor_ciudad_/g, replacement: "club_ciudad_" },
  { regex: /gibbor_telefono_/g, replacement: "club_telefono_" },
  { regex: /gibbor_firma_director_/g, replacement: "club_firma_director_" },
  { regex: /estrategia-gibbor-/g, replacement: "estrategia-club-" },
];

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      for (const pattern of searchPatterns) {
        if (pattern.regex.test(content)) {
          content = content.replace(pattern.regex, pattern.replacement);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

directoriesToScan.forEach(dir => {
  const fullDirPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(fullDirPath)) {
    processDirectory(fullDirPath);
  }
});

console.log("Done parsing and replacing Gibbor references.");

const fs = require('fs');

function applyFix(filePath) {
  let data = fs.readFileSync(filePath, 'utf8');

  // Para Reportes
  if (filePath.includes('reportes')) {
    const oldReportes = `const fechaIng = new Date(p.fecha_ingreso_club || p.fecha_ingreso || tenant?.created_at || p.created_at || new Date());
        const anioIngreso = fechaIng.getFullYear();
        const mesIngreso = fechaIng.getMonth() + 1;
        
        if (anioIngreso > anioSel || (anioIngreso === anioSel && mesIngreso > mesSel)) {
          return false;
        }
        
        return true;`;
        
    const newReportes = `const fechaIngresoExplicita = p.fecha_ingreso_club || p.fecha_ingreso;
        if (!fechaIngresoExplicita) return true;

        const fechaIng = new Date(fechaIngresoExplicita);
        const anioIngreso = fechaIng.getFullYear();
        const mesIngreso = fechaIng.getMonth() + 1;
        
        if (anioIngreso > anioSel || (anioIngreso === anioSel && mesIngreso > mesSel)) {
          return false;
        }
        
        return true;`;
        
    if(data.includes(oldReportes)) {
        data = data.replace(oldReportes, newReportes);
        fs.writeFileSync(filePath, data, 'utf8');
        console.log('Fixed Reportes');
    }
  }

  // Para Cobranza
  if (filePath.includes('cobranza')) {
    const oldCobranza = `const fechaIng = new Date(j.fecha_ingreso_club || j.fecha_ingreso || tenant?.created_at || j.created_at || new Date());
      const anioIngreso = fechaIng.getFullYear();
      const mesIngreso = fechaIng.getMonth() + 1;
      
      if (anioIngreso > anioSelCobranza || (anioIngreso === anioSelCobranza && mesIngreso > mesSelCobranza)) {
        return false;
      }
      return true;`;
      
    const newCobranza = `const fechaIngresoExplicita = j.fecha_ingreso_club || j.fecha_ingreso;
      if (!fechaIngresoExplicita) return true;

      const fechaIng = new Date(fechaIngresoExplicita);
      const anioIngreso = fechaIng.getFullYear();
      const mesIngreso = fechaIng.getMonth() + 1;
      
      if (anioIngreso > anioSelCobranza || (anioIngreso === anioSelCobranza && mesIngreso > mesSelCobranza)) {
        return false;
      }
      return true;`;
      
    if(data.includes(oldCobranza)) {
        data = data.replace(oldCobranza, newCobranza);
        fs.writeFileSync(filePath, data, 'utf8');
        console.log('Fixed Cobranza');
    }
  }
}

applyFix('C:\\\\Users\\\\Alex Toscano\\\\Desktop\\\\Gibbor App\\\\gibbor-app-multiclub\\\\app\\\\director\\\\reportes\\\\page.tsx');
applyFix('C:\\\\Users\\\\Alex Toscano\\\\Desktop\\\\Gibbor App\\\\gibbor-app-multiclub\\\\app\\\\director\\\\cobranza\\\\page.tsx');

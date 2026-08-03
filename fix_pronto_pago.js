const fs = require('fs');
const file = 'C:\\Users\\Alex Toscano\\Desktop\\Gibbor App\\gibbor-app-multiclub\\app\\director\\reportes\\page.tsx';
let data = fs.readFileSync(file, 'utf8');

const oldLogic = `      const currentPlanName = (j.tipo_plan || 'Regular').toLowerCase();
      const planBuscado = planes.find(p => p.nombre.toLowerCase() === currentPlanName);
      const esBeca100 = (planBuscado?.precio_base === 0) || currentPlanName.includes('100');
      
      const tarifaActual = j.tarifa || calcularTarifa(j.tipo_plan);
      if (esBeca100 || tarifaActual === 0) return;`;

const newLogic = `      const currentPlanName = (j.tipo_plan || 'Regular').toLowerCase();
      const planBuscado = planes.find(p => p.nombre.toLowerCase() === currentPlanName);
      const esBeca100 = (planBuscado?.precio_base === 0) || currentPlanName.includes('100');
      
      let tarifaBase = Number(planBuscado?.precio_base || 0);
      const descuentoProntoPago = Number(planBuscado?.descuento_pronto_pago || 0);
      const limiteProntoPago = Number(planBuscado?.dias_limite_pronto_pago || 5);
      const precioConDescuento = tarifaBase - descuentoProntoPago;

      // Emular la lógica de Cobranza: si estamos en el mismo mes y hoy <= limite,
      // la tarifa esperada (tarifaObjetivo) es el precio con descuento.
      const hoy = new Date();
      const [anioSel, mesSel] = periodoActual.split('-');
      const esMismoPeriodo = hoy.getFullYear() === Number(anioSel) && (hoy.getMonth() + 1) === Number(mesSel);
      
      let tarifaObjetivo = tarifaBase;
      if (esMismoPeriodo && hoy.getDate() <= limiteProntoPago && !esBeca100) {
        tarifaObjetivo = precioConDescuento;
      }

      // Si el jugador ya tiene una tarifa personalizada (j.tarifa), la usamos,
      // a menos que sea 0, en cuyo caso usamos la tarifaObjetivo calculada.
      const tarifaFinal = j.tarifa || tarifaObjetivo;

      if (esBeca100 || tarifaFinal === 0) return;`;

data = data.replace(oldLogic, newLogic);

const oldPendingLogic = `      const pendienteActual = esAlDia ? 0 : Math.max(0, tarifaActual - totalMesActual);

      if (pendienteActual > 0) {
        deudaTotalMes += pendienteActual;
        morososList.push({ ...j, deudaTotal: pendienteActual, tarifa: tarifaActual });
      }`;

const newPendingLogic = `      const esAlDia = totalMesActual >= (tarifaFinal - 100) || totalMesActual >= (precioConDescuento - 100);

      // Si están al día (incluso si pagaron con descuento), no deben nada.
      const pendienteActual = esAlDia ? 0 : Math.max(0, tarifaFinal - totalMesActual);

      if (pendienteActual > 0) {
        deudaTotalMes += pendienteActual;
        morososList.push({ ...j, deudaTotal: pendienteActual, tarifa: tarifaFinal });
      }`;

data = data.replace(oldPendingLogic, newPendingLogic);

fs.writeFileSync(file, data, 'utf8');
console.log('Fixed pronto pago discount simulation in reportes');

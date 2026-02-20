const { fetch } = require('undici');

// Function to call Gemini generative API with a given prompt
// Function to call Gemini generative API with a given prompt
// Function to call Gemini generative API with a given prompt or fallback to local analysis
async function analyzeWithPrompt(prompt) {
  // Intentar llamar a la API si la key existe
  if (process.env.GEMINI_API_KEY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };
    try {
      const apiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const apiData = await apiRes.json();
      if (apiData.candidates && apiData.candidates.length > 0 && apiData.candidates[0].content) {
        return apiData.candidates[0].content.parts[0].text;
      }
      console.warn('AI API response incomplete, falling back to local analysis.', apiData);
    } catch (err) {
      console.error('aiService fetch error:', err);
    }
  } else {
    console.warn('Gemini API key is not set, using local analysis.');
  }

  // FALLBACK: Análisis Local Determinista
  if (prompt.includes('Análisis de Enlace DWDM')) {
    // Extraer datos del prompt de enlace individual
    const idMatch = prompt.match(/Identificador: (.+)/);
    const identifier = idMatch ? idMatch[1] : 'Desconocido';
    const historyMatches = [...prompt.matchAll(/(\d{4}-\d{2}-\d{2}.+): ([\d\.]+) dB/g)];

    let analysis = `### 🔍 Análisis Local Automático (Modo Offline)\n\n`;
    analysis += `**Enlace:** ${identifier}\n\n`;

    if (historyMatches.length > 0) {
      const values = historyMatches.map(m => parseFloat(m[2]));
      const last = values[0];
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const trend = values.length > 1 ? (values[0] - values[values.length - 1]) : 0;

      analysis += `**Estadísticas Recientes:**\n`;
      analysis += `- **Último Valor:** ${last.toFixed(2)} dB\n`;
      analysis += `- **Promedio:** ${avg.toFixed(2)} dB\n`;
      analysis += `- **Rango Operativo:** ${min.toFixed(2)} dB - ${max.toFixed(2)} dB\n\n`;

      analysis += `**Diagnóstico:**\n`;
      if (last > 25) {
        analysis += `⚠️ **ALERTA CRÍTICA:** La atenuación actual (${last.toFixed(2)} dB) es extremadamente alta. Posible corte de fibra o degradación severa.\n`;
      } else if (last > avg + 2) {
        analysis += `⚠️ **Advertencia:** Se detecta una degradación significativa respecto al promedio histórico.\n`;
      } else if (Math.abs(trend) < 1) {
        analysis += `✅ **Estable:** El enlace muestra un comportamiento estable dentro de los parámetros normales.\n`;
      } else {
        analysis += `ℹ️ **Variación Detectada:** Existe una fluctuación de ${Math.abs(trend).toFixed(2)} dB en el periodo analizado.\n`;
      }
    } else {
      analysis += `No hay suficientes datos históricos para un análisis detallado.`;
    }
    return analysis;
  }

  if (prompt.includes('Análisis del siguiente resumen')) {
    // Extraer datos del prompt de resumen
    const totalMatch = prompt.match(/Total Enlaces: (\d+)/);
    const critMatch = prompt.match(/Estado Crítico: (\d+)/);
    const warnMatch = prompt.match(/Estado Advertencia: (\d+)/);

    const total = totalMatch ? parseInt(totalMatch[1]) : 0;
    const critical = critMatch ? parseInt(critMatch[1]) : 0;
    const warning = warnMatch ? parseInt(warnMatch[1]) : 0;

    let report = `### 📊 Reporte Ejecutivo Automático (Cisco Span)\n\n`;
    report += `Este reporte ha sido generado automáticamente por el sistema local ante la falta de conectividad con el servicio de IA.\n\n`;
    report += `**Resumen de Salud de la Red:**\n`;
    report += `- Total de Tramos Analizados: **${total}**\n`;
    report += `- Tramos Críticos: **${critical}**\n`;
    report += `- Tramos en Advertencia: **${warning}**\n\n`;

    report += `**Diagnóstico General:**\n`;
    if (critical > 0) {
      report += `🚨 **ACCIÓN REQUERIDA:** Se han detectado **${critical}** tramos en estado crítico que superan los umbrales máximos permitidos. Se recomienda revisión inmediata por parte del equipo de campo.\n`;
    } else if (warning > 0) {
      report += `⚠️ **Atención:** Aunque no hay cortes críticos, **${warning}** tramos muestran signos de degradación. Programar mantenimientos preventivos.\n`;
    } else {
      report += `✅ **Red Saludable:** Todos los tramos operan dentro de los parámetros normales esperados.\n`;
    }

    return report;
  }

  return 'Análisis local no disponible para este tipo de consulta.';
}

module.exports = { analyzeWithPrompt };

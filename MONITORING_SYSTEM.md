# 📡 Sistema de Monitoreo de Transporte Óptico (NMS-Perf)

## 🚀 Resumen del Proyecto
Este sistema es una capa de inteligencia y notificaciones construida sobre el NMS de Padtec. Su objetivo es detectar degradaciones críticas en la capa de transporte óptico (DWDM) y alertar al equipo de ingeniería de forma proactiva a través de Telegram y un panel administrativo de alto rendimiento.

---

## 🧠 Arquitectura del Motor
El sistema se divide en tres componentes clave que funcionan de forma asíncrona:

### 1. Motor de Fondo (Background Worker)
- **Localización**: `backend-performance/src/services/nmsWorker.js`
- **Función**: Corre 24/7 en el servidor. Cada X minutos (configurable), realiza el login en el NMS, descarga los niveles de potencia y procesa los cálculos de pérdida.
- **Autonomía**: Funciona independientemente de si la interfaz web está abierta o no.

### 2. Monitor de Incidentes Activos (Stateful Alarms)
- **Localización**: `prisma/schema.prisma` (Tabla `active_alarms`)
- **Lógica**: Implementa "Aclaramiento Automático" (Auto-Clear).
  - **Detección**: Si la pérdida > (Referencia + Umbral), genera una alarma.
  - **Supresión**: Solo envía **UNA** notificación a Telegram para evitar SPAM.
  - **Auto-Clear**: Si el nivel vuelve a la normalidad, el sistema borra la alarma y envía un mensaje de "RECUPERACIÓN" automáticamente.

### 3. Panel de Ingeniería (Frontend)
- **Localización**: `/admin/settings`
- **Funciones**:
  - **Monitor Live**: Visualización en tiempo real (ajustable) de las fallas en curso.
  - **Aceptación (ACK)**: Permite a los especialistas marcar un incidente como "En Atención".
  - **Calibración Global**: Botón "Nuclear" para resetear todas las referencias a los valores actuales (Línea Base).

---

## ⚙️ Parámetros Configurables (Admin)
Todos estos valores se guardan en la base de datos y se sincronizan en tiempo real:

| Parámetro | Función | Recomendación |
|-----------|---------|---------------|
| **Escaneo NMS** | Frecuencia de consulta al backend de Padtec. | 5 min (mínimo NMS) |
| **Umbral Crítico** | Margen de pérdida sobre la referencia para disparar alarma. | 3.0 - 5.0 dB |
| **Refresco Web** | Cada cuánto se actualiza el monitor en pantalla. | 60 segundos |
| **URL Pública** | Base URL para los botones interactivos de Telegram. | `https://su-portal.com` |
| **Mantenimiento** | Activa ventana de silencio de alertas recurrentes. | Usar en fibra cortada |
| **Telegram ID** | Identificador del grupo/canal de alertas. | - |
| **Branding** | Encabezado y pie de los mensajes de alerta. | Personalizar por equipo |

---

## ⚡ Funciones Avanzadas

### 🎯 Notificaciones Interactivas
Cada alerta de Telegram incluye botones dinámicos:
- **🖥️ Ver Monitor**: Salto directo al panel de incidentes activos.
- **📊 Historial**: Abre la ficha técnica y tendencia histórica de ese enlace específico.

### 🛠️ Ventana de Mantenimiento Inteligente
Al activar el modo mantenimiento:
1. **Confianza**: El sistema **SIEMPRE** notifica el primer evento (para confirmar que el sensor funciona).
2. **Silencio**: Las alertas recurrentes se bloquean para no saturar al equipo.
3. **Contexto**: Todos los mensajes se prefijan con `[MANTENIMIENTO 🛠️]`.
4. **Auto-Cierre**: Al finalizar la ventana de tiempo, el sistema vuelve a su sensibilidad normal automáticamente.
1. **Instalación/Normalidad**: Una vez los enlaces estén estables, usar el botón **"Calibrar Referencias Globales"**. Esto pone el contador de degradación a 0.0 dB.
2. **Ajuste de Alarma**: Definir el **Umbral Crítico**. Si se coloca en `1.0`, cualquier salto de pérdida de un punto sobre el valor de hoy disparará Telegram.
3. **Mantenimiento**: Si se realiza un trabajo físico, usar el botón **"Clear"** manual para limpiar alertas residuales.

---
*Documento generado el 07/02/2026 para el Equipo de Transporte Óptico.* 🛡️🦾🏁

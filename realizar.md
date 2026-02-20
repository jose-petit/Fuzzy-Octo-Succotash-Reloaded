# Plan de Ejecución: Mejoras Span Processor & Telegram Bot

Este documento detalla los pasos para consolidar las mejoras identificadas en el sistema de monitoreo, integrando lo mejor de `mododelta`, `RECOVERY_WEB_TEMP` y el estado actual.

## 1. Migración de Bot de Telegram (Comando /span)
Actualmente el bot solo maneja enlaces Padtec. Se debe integrar el soporte para Cisco Span Processor.

- [ ] **Nuevo Comando `/span [nombre] `**: Consultar niveles de atenuación de la tabla `spans` (Cisco).
- [ ] **Nuevo Comando `/spanes` o `/resumen_cisco`**: Ver un resumen del último lote cargado via CSV.
- [ ] **Soporte Multi-Token**: Asegurar que las alertas de Cisco usen `TELEGRAM_BOT_TOKEN_CISCO` si está configurado, para separar canales de comunicación.
- [ ] **Integración en `commandService.js`**: Añadir los handlers correspondientes consultando la base de datos de spans.

## 2. Mejoras en la Tabla de Enlaces (Cisco)
Refactorizar `LinksTable.tsx` para alcanzar el "Gold Standard".

- [ ] **Columna "Status Operativo"**: Calcular dinámicamente:
    - `OK`: Dentro de rango [Min, Max].
    - `PRECAUCIÓN`: Cerca del límite Max (> 80% del rango).
    - `CRÍTICO`: Fuera de rango (> Max).
- [ ] **Filtros Dinámicos**: Por Nodo Origen, Nodo Destino y Estado.
- [ ] **Diseño Premium**: Aplicar Glassmorphism, animaciones de Framer Motion e iconos de Lucide (visto en `RECOVERY_WEB_TEMP`).

## 3. Motor de Alertas Inteligentes (Smart Alerts)
Implementar la lógica de detección avanzada en el backend de procesamiento.

- [ ] **Detección de Drift**: Alerta si la atenuación sube lentamente (ej. > 2dB en 24h) comparando contra el mínimo histórico del día.
- [ ] **Rapid Increase**: Alerta instantánea si hay un salto súbito (ej. > 1.5dB entre dos muestras consecutivas).
- [ ] **Confirmación de Muestras**: No disparar alerta hasta tener N muestras consecutivas (valor configurable en Admin).

## 4. Consolidación de Configuraciones Cisco
- [ ] **Thresholds Editor**: Migrar el componente dedicado de `RECOVERY_WEB_TEMP` para edición masiva de límites Min/Max.
- [ ] **Auto-Upload Watcher**: Asegurar que `backend-span` use `chokidar` para procesar automáticamente los CSVs que caigan en la carpeta `/csv-drop`.

## 5. Mantenimiento y Documentación
- [ ] **Actualizar `DOCUMENTATION_MAINTENANCE.md`** con los nuevos comandos del bot.
- [ ] **Validar Variables de Entorno**: Asegurar que `.env` tenga todos los tokens necesarios para Cisco.

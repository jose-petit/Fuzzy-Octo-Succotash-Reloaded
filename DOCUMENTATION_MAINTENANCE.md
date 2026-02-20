# Documentación de Configuración y Mantenimiento - NMS Combined

Este documento detalla la arquitectura actual, los cambios realizados y los pasos críticos para el mantenimiento y restauración del sistema de notificaciones y monitoreo de performance.

## 🏗️ Arquitectura del Sistema

El proyecto es una solución **combinada** que integra el frontend (Next.js), elbackend de performance (Express) y servicios de base de datos distribuidos en contenedores Docker.

### Componentes Principales:
1.  **Web (Next.js)**: Puerto `4000`. Maneja la interfaz de usuario, autenticación y proxies de API.
2.  **Performance Backend**: Puerto `5000` (interno), `5050` (host). Procesa la telemetría de Padtec, calcula pérdidas de fibra y envía alertas a Telegram.
3.  **MySQL WN (`mysql_wn_combined`)**: Puerto `4306`. Base de datos principal de notificaciones y configuración.
4.  **MySQL Span (`mysql_span_combined`)**: Puerto `4307`. Base de datos para el historial de telemetría y cálculos del Span Processor.

---

## 🔧 Configuraciones Críticas Realizadas

### 1. Proxy de API (`/api/nms-proxy`)
Para evitar problemas de CORS y redes complejas en Docker, todas las peticiones desde el frontend al backend de performance se rutan a través de un proxy interno:
-   **Archivo**: `pages/api/nms-proxy/[...path].ts`
-   **Timeout**: Incrementado a **60s** para manejar procesos largos de persistencia.
-   **Seguridad**: Incluye validación de sesión con `next-auth`.

### 2. Base de Datos Histórica
Se configuró el volumen externo para recuperar los datos previos:
-   **Volumen**: `web-notifications_db_web_notifications`
-   **Tabla `system_settings`**: Se ajustó el backend para usar las columnas `name` y `data` (compatibilidad con la DB histórica).

### 3. Hot-Reloading en Desarrollo
El `docker-compose.yml` monta los volúmenes locales en `/app` para que los cambios en el código se reflejen instantáneamente sin reconstruir la imagen.

---

## 🚀 Guía de Restauración y Mantenimiento

### Restauración de Base de Datos
Si necesitas migrar o restaurar los datos, asegúrate de que el volumen esté declarado como `external` en el `docker-compose.yml`:
```yaml
volumes:
  db_wn_data:
    external: true
    name: web-notifications_db_web_notifications
```

### Comandos de Diagnóstico Útiles
-   **Verificar conteo de registros**:
    `docker exec mysql_wn_combined mysql -u web_user -pweb_pass -e "use web_notifications; select count(*) from spans;"`
-   **Ver logs en tiempo real (Performance)**:
    `docker logs -f nms_backend_combined`
-   **Ver logs en tiempo real (Web)**:
    `docker logs -f web_combined`

---

## 🤖 Bot de Telegram (Padtec & Cisco)
El sistema incluye un bot de comando unificado para consulta de red:

### Comandos Disponibles:
- `/enlace [serial/alias]` - Detalle de niveles Padtec (TX/RX, Temp, Pérdida).
- `/span [nombre]` - Consulta el estado de enlaces Cisco Span Processor.
- `/last` - Resumen del último lote de carga Cisco (incluye contador de estados).
- `/resumen` - Salud global de la red Padtec.
- `/historico` - Gráfica de 24h generada vía QuickChart.

### Alertas Inteligentes (Smart Alerts):
El motor de procesamiento ahora detecta automáticamente:
1. **Nivel Crítico**: Si se supera el `max_span` configurado.
2. **Incremento Súbito**: Si la atenuación sube más de **1.5 dB** entre dos cargas consecutivas (Cisco).
3. **Drift**: Alertas progresivas por degradación lenta (Padtec).

---

## ⚠️ Detalles Relevantes (Gotchas)

- **Cisco Database**: El bot ahora requiere conexión a `mysql_span_combined` para el comando `/span`. Esto se configura mediante variables `DB_SPAN_*`.
- **Memoria**: Next.js en modo desarrollo consume bastantes recursos. Si ves errores de `ENOMEM`, reinicia el contenedor con `docker restart web_combined`.
- **Credenciales Padtec**: Se configuran mediante variables de entorno en el backend (`PADTEC_URL`, `PADTEC_USER`, `PADTEC_PASS`).
- **Telegram**: El bot se inicializa automáticamente y consulta la tabla `telegram_destinations` para los envíos. Si un chat no recibe alertas, verifica que el `chat_id` tenga el permiso activo en la tabla.

---

## ✅ Resumen de Avances Recientes
- [x] Unificación exitosa de los servicios en un solo `docker-compose.yml`.
- [x] Integración de comando `/span` en el bot de Telegram para soporte multimarca.
- [x] Implementación de "Estado Operativo" dinámico en la tabla de resultados.
- [x] Motor de alertas para Cisco optimizado con detección de incrementos súbitos.
- [x] Dashboard de Grafana vinculado dinámicamente desde la vista de enlaces.

*Última actualización: 20 de Mayo, 2026*

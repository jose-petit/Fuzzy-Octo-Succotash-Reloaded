# 📡 BROADCAST TELEGRAM - GUÍA SIMPLE

## ✅ IMPLEMENTACIÓN COMPLETADA

El sistema de broadcast ahora funciona **automáticamente** sin necesidad de cambios en la UI.

---

## 🎯 Cómo Funciona

1. **Vinculas un chat** en `/admin/settings` como siempre lo has hecho
2. **Agregas destinos adicionales** a la base de datos (ver abajo)
3. **Todas las notificaciones** se envían automáticamente a TODOS los destinos activos

---

## 📝 Agregar Destinos para Broadcast

### **Opción 1: Usando el Script PowerShell**

```powershell
# Agregar un grupo
.\add_telegram_destination.ps1 -ChatId "-5136763519" -ChatName "Grupo Monitoreo Principal" -ChatType "group"

# Agregar un chat privado
.\add_telegram_destination.ps1 -ChatId "123456789" -ChatName "José Petit" -ChatType "private"
```

### **Opción 2: Directamente en MySQL**

```bash
docker exec -i mysql_staging_web_notifications mysql -uweb_user -pweb_pass web_notifications
```

Luego ejecutar:

```sql
INSERT INTO telegram_destinations (chat_id, chat_name, chat_type, is_active) 
VALUES ('-5136763519', 'Grupo Monitoreo', 'group', TRUE);
```

---

## 🔍 Ver Destinos Configurados

```bash
docker exec -i mysql_staging_web_notifications mysql -uweb_user -pweb_pass web_notifications -e "SELECT * FROM telegram_destinations;"
```

---

## 🧪 Probar el Broadcast

1. **Ir a** `/admin/settings`
2. **Scroll** hasta "Centro de Simulacros"
3. **Click** en "🔥 Alerta Crítica"
4. **Verificar** que llega a TODOS los destinos configurados

### **Ver Logs**

```bash
docker logs performance_staging --tail=30
```

Deberías ver:

```
📡 [Telegram Broadcast] Enviando a 3 destinos...
✅ Enviado a: Grupo Monitoreo Principal (-5136763519)
✅ Enviado a: José Petit (123456789)
✅ Enviado a: Grupo Respaldo (-9876543210)
📊 Broadcast completado: 3 exitosos, 0 fallidos
```

---

## ⚙️ Activar/Desactivar Destinos

```sql
-- Desactivar un destino
UPDATE telegram_destinations SET is_active = FALSE WHERE chat_id = '-5136763519';

-- Activar un destino
UPDATE telegram_destinations SET is_active = TRUE WHERE chat_id = '-5136763519';

-- Eliminar un destino
DELETE FROM telegram_destinations WHERE chat_id = '-5136763519';
```

---

## 📊 Comportamiento

- **Si hay destinos activos**: Envía a TODOS los destinos activos
- **Si NO hay destinos**: Usa el chat ID configurado en Settings (fallback)
- **Alarmas reales**: Se envían automáticamente a todos
- **Simulaciones**: Se envían automáticamente a todos
- **Reportes**: Se envían automáticamente a todos

---

## 🔧 Archivos Modificados

```
backend-performance/src/routes/spans.js
├─ Usa broadcastTelegramNotification() en lugar de sendTelegramNotification()
├─ Línea 460: Import del servicio
├─ Línea 518: Alarmas críticas
├─ Línea 552: Recuperaciones
└─ Línea 642: Simulaciones

backend-performance/src/services/telegramService.js
└─ broadcastTelegramNotification() ya implementado
```

---

## ✨ Ventajas

- ✅ **Sin cambios en UI**: Todo funciona como antes
- ✅ **Automático**: No necesitas seleccionar nada
- ✅ **Flexible**: Agrega/quita destinos desde la base de datos
- ✅ **Fallback**: Si no hay destinos, usa el chat configurado
- ✅ **Logs detallados**: Puedes ver exactamente a quién se envió

---

## 🚀 Ejemplo Completo

```powershell
# 1. Agregar destinos
.\add_telegram_destination.ps1 -ChatId "-5136763519" -ChatName "Grupo Principal"
.\add_telegram_destination.ps1 -ChatId "123456789" -ChatName "José Petit" -ChatType "private"

# 2. Verificar
docker exec -i mysql_staging_web_notifications mysql -uweb_user -pweb_pass web_notifications -e "SELECT * FROM telegram_destinations;"

# 3. Probar
# Ir a /admin/settings y enviar una simulación

# 4. Ver logs
docker logs performance_staging --tail=30
```

---

**🛡️ Sistema de Broadcast Funcionando 🦾**

**Última actualización**: 2026-02-07 04:25:00 (UTC-4)

### Nextjs MySQL CRUD

Nextjs CRUD using MySQL and TailwindCSS

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Plan de Mejoras y Roadmap

A continuación se presentan las principales áreas de trabajo y optimizaciones planificadas para futuras iteraciones:

1. **Calidad de código & Convenciones**
   - Configurar ESLint y Prettier para mantener estándares de estilo y detectar errores tempranos.
   - Revisar nombres de variables y evitar duplicación de lógica.

2. **Tipado y Robustez**
   - Migrar a TypeScript gradualmente.
   - Usar validación de esquemas con Zod/Joi en rutas API.

3. **Arquitectura de React**
   - Extraer hooks personalizados para fetch y lógica de enlaces.
   - Implementar `React.memo`, `useCallback` para optimizar renders.
   - Lazy-load de componentes (modales, tablas) con dynamic imports.

4. **Rendimiento & UX**
   - Cachear datos con React Query (staleTime, cacheTime adecuados).
   - Virtualizar o paginar tablas largas.
   - Añadir skeleton loaders para estados de carga.

5. **Backend API & Base de Datos**
   - Unificar o clarificar uso de Next.js API routes vs Express (`backend-performance`).
   - Optimizar consultas MySQL: índices en columnas usadas en filtrados.
   - Configurar pool de conexiones y manejar timeouts.

6. **Docker & Despliegue**
   - Optimizar Dockerfiles con multi-stage builds y eliminar devDependencies.
   - Definir healthchecks y políticas de reinicio en `docker-compose.yml`.
   - Externalizar configuraciones y credenciales en variables de entorno.

7. **Testing & CI/CD**
   - Añadir pruebas unitarias y de integración con Jest y React Testing Library.
   - Configurar pipeline de CI en GitHub Actions para lint, build y tests.

8. **Seguridad**
   - Sanitizar entradas en frontend y backend para prevenir XSS/SQL Injection.
   - Implementar headers de seguridad (CSP, HSTS) y uso de HTTPS en producción.

9. **Monitorización & Logging**
   - Integrar Sentry en frontend y backend para captura de errores.
   - Centralizar logs con Winston o Pino y usar niveles adecuados.

10. **Documentación**

- Completar el README con guías de desarrollo, despliegue y testing.
- Añadir comentarios en funciones complejas y generar documentación interna.

---

## 🔧 Funciones Avanzadas (Ocultas en UI)

Las siguientes funciones están disponibles pero ocultas de la interfaz principal para evitar uso accidental. Se acceden mediante código o configuración manual.

### 📡 Calibración Global de Referencias

**Ubicación**: `pages/admin/settings.tsx` (líneas comentadas)

**Propósito**: Resetea los niveles de referencia de pérdida de TODA la red a los valores actuales medidos, deteniendo todas las alarmas activas.

**Cuándo usar**:
- Después de mantenimiento mayor en la red
- Cuando se reemplazan múltiples empalmes
- Para recalibrar después de cambios en la topología física

**Cómo activar**:
1. Descomentar las líneas del botón en `pages/admin/settings.tsx`
2. Acceder a `/admin/settings`
3. Hacer clic en "Calibrar Referencias Globales"
4. Confirmar la acción (⚠️ irreversible)

**Endpoint API**: `POST /api/spans/calibrate-all`

**⚠️ ADVERTENCIA**: Esta acción es irreversible y afecta toda la red. Usar solo cuando sea absolutamente necesario.

---

---

## 🤖 Bot Interactivo de Telegram

El sistema incluye un bot integrado que permite consultas en tiempo real y gestión remota básica.

### Comandos Disponibles
- `/live`: Resumen en tiempo real de los enlaces con mayor degradación.
- `/status`: Estado de salud del sistema, último ciclo de escaneo y estadísticas de inventario.
- `/enlace [serial]`: Consulta detallada de potencias (IN/OUT Line, IN/OUT Data) y temperatura para una tarjeta específica.
- `/help`: Guía rápida de comandos.

### Características del Bot
- **Polling Inteligente**: Procesa comandos de forma asíncrona sin afectar el monitoreo.
- **Respuestas con Datos Live**: Los datos provienen directamente del cache en memoria del backend de performance.
- **Acceso Multi-Grupo**: Responde en cualquier chat donde esté configurado como destino activo.

---

## 🛠️ Gestión de Mantenimiento y Eventos

Se ha implementado un centro de control para el ciclo de vida de la red en `/admin/maintenance`.

### Ventanas de Mantenimiento
- **Programación**: Permite definir ventanas con fecha/hora de inicio y fin.
- **Asociación**: Vincular trabajos a enlaces específicos usando su serial.
- **Visualización**: Panel visual con estados (Programada, Activa, Finalizada, Cancelada).

### Historial de Incidencias
- **Registro de Eventos**: Log detallado de cambios significativos en la red.
- **Severidad**: Clasificación de eventos (INFO, WARNING, CRITICAL).
- **Auditoría**: Seguimiento de degradaciones históricas por enlace para estudios de calidad.

---

### 📝 Nota Técnica sobre Hot-Reload

Los cambios en configuración (ID de Telegram, Umbrales, Intervalos) se aplican **instantáneamente** sin necesidad de reiniciar los contenedores Docker. El sistema recarga la configuración desde la base de datos en cada ciclo de escaneo.

---

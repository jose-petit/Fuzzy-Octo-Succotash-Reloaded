# Build stage
FROM node:20-slim AS builder
WORKDIR /app
# Instalar dependencias necesarias para el build
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Instala dependencias basadas en package-lock.json
COPY package.json package-lock.json ./
# Usamos npm ci para instalación limpia y rápida
# Usamos npm install para manejar drift del lockfile
RUN npm install --legacy-peer-deps

COPY . ./

# Generar cliente de Prisma
RUN npx prisma generate

# Desactivar telemetría de Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV SENTRY_DISABLE_AUTO_UPLOAD=true
ENV SENTRY_NO_PROGRESS_BAR=1

# Build de la aplicación Next.js
RUN npm run build

# Run stage
FROM node:20-slim AS runner
WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3001
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia solo archivos necesarios para producción
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production --legacy-peer-deps

# Copiar artefactos de Prisma y generar cliente
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

# Copiar el build de Next.js
# Next.js standalone output es mejor para Docker, pero por ahora usaremos el build estándar
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./

USER nextjs

EXPOSE 3001

CMD ["npm", "start"]

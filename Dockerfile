# ==========================================
# OASIS NICARAGUA - Production Dockerfile
# Optimized multi-stage build for Next.js 15 Backend
# ==========================================

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar archivos de dependencias
COPY Backend/package*.json ./Backend/
COPY package*.json ./

# Instalar dependencias del Backend
WORKDIR /app/Backend
RUN npm ci

# Volver a la raíz y copiar todo el código fuente
WORKDIR /app
COPY . .

# Generar cliente de Prisma usando el esquema compartido
WORKDIR /app/Backend
ENV PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1
RUN npx prisma generate

# Compilar la aplicación Next.js
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app/Backend
ENV NODE_ENV=production

# Copiar dependencias y archivos compilados desde builder
COPY --from=builder /app/Backend/package*.json ./
COPY --from=builder /app/Backend/node_modules ./node_modules
COPY --from=builder /app/Backend/.next ./.next
COPY --from=builder /app/Backend/src ./src
COPY --from=builder /app/Backend/public ./public
COPY --from=builder /app/Base_de_Datos ../Base_de_Datos

EXPOSE 8000
ENV PORT=8000

CMD ["npm", "run", "start"]

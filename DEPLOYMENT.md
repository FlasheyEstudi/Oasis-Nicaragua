# 🚀 Guía de Despliegue — Oasis Nicaragua

Esta guía detalla los pasos para desplegar el backend y la base de datos de Oasis Nicaragua en entornos de producción reales.

---

## 1. Base de Datos (Supabase / PostgreSQL)

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Copia la URL de conexión de la base de datos en la sección **Settings > Database > Connection Strings**.
   * Obtén la URL **Transaction Mode** (generalmente puerto 6543) para `DATABASE_URL`.
   * Obtén la URL **Session Mode** (generalmente puerto 5432) para `DIRECT_DATABASE_URL`.
3. Aplica el esquema de la base de datos desde tu entorno local al servidor de producción:
   ```bash
   cd Backend
   # Generar cliente local
   npx prisma generate
   # Empujar el esquema a producción
   DATABASE_URL="tu_url_de_supabase_transaction" npx prisma db push
   ```

---

## 2. Backend & WebSockets (Render)

Render es idóneo para alojar servicios de Node.js de larga duración que requieren WebSockets permanentes (Socket.IO).

1. Crea un nuevo **Web Service** en [Render](https://render.com/).
2. Conecta tu repositorio de GitHub `Oasis-Nicaragua`.
3. Configura los siguientes parámetros en el panel de control:
   * **Root Directory**: `Backend`
   * **Runtime**: `Node`
   * **Build Command**: `npm ci && npm run build`
   * **Start Command**: `npm run start`
   * **Instance Type**: Al menos el plan de pago básico (Starter) para evitar que la instancia entre en reposo (lo que interrumpiría los WebSockets).
4. Agrega las siguientes variables de entorno (**Environment Variables**):
   * `NODE_ENV`: `production`
   * `PORT`: `8000`
   * `DATABASE_URL`: `tu_conexion_supabase_transaction`
   * `DIRECT_DATABASE_URL`: `tu_conexion_supabase_session`
   * `JWT_SECRET`: `tu_clave_secreta_jwt_de_32_caracteres`
   * `JWT_ACCESS_SECRET`: `tu_clave_secreta_jwt_access`
   * `JWT_REFRESH_SECRET`: `tu_clave_secreta_jwt_refresh`
   * `FIREBASE_ADMIN_PROJECT_ID`: `id-de-tu-proyecto-firebase`
   * `FIREBASE_ADMIN_CLIENT_EMAIL`: `correo-de-cuenta-de-servicio-firebase`
   * `FIREBASE_ADMIN_PRIVATE_KEY`: `clave-privada-firebase-en-formato-completo`
   * `SMTP_USER`: `tu_correo_transaccional`
   * `SMTP_PASS`: `tu_password_smtp`
   * `ALLOWED_ORIGINS`: `https://tu-frontend-en-vercel.vercel.app`

---

## 3. Frontend (Vercel)

El frontend PWA (cuando sea desarrollado en Next.js) se desplegará en Vercel para una velocidad óptima de CDN.

1. Crea un proyecto en [Vercel](https://vercel.com/) conectando tu repositorio.
2. Configura los parámetros básicos:
   * **Root Directory**: `Frontend`
   * **Framework Preset**: `Next.js`
3. Agrega las variables de entorno especificadas en el archivo `.env.local.example` del frontend.

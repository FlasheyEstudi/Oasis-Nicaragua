# 🌿 OASIS NICARAGUA - ECOSISTEMA DIGITAL AVANZADO
## Ecosistema Digital de Salud, Farmacias y Logística de Distribución

<div align="center">

```
 ██████╗  █████╗  ███████╗██╗███████╗
██╔═══██╗██╔══██╗██╔════╝██║██╔════╝
██║   ██║███████║███████╗██║███████╗
██║   ██║██╔══██║╚════██║██║╚════██║
╚██████╔╝██║  ██║███████║██║███████║
 ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝╚══════╝
```

### *Tu refugio de salud digital avanzada para Nicaragua*

[![Next.js](https://img.shields.io/badge/Next.js-15.1.1-black?style=for-the-badge&logo=nextdotjs)](#)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](#)
[![Prisma](https://img.shields.io/badge/Prisma-ORM_6.11.1-2D3748?style=for-the-badge&logo=prisma)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwindcss)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=for-the-badge&logo=postgresql)](#)
[![Supabase](https://img.shields.io/badge/Supabase-Cloud-3FCF8E?style=for-the-badge&logo=supabase)](#)
[![Firebase](https://img.shields.io/badge/Firebase-FCM-FFCA28?style=for-the-badge&logo=firebase)](#)
[![MapLibre GL](https://img.shields.io/badge/MapLibre_GL-5.24-199900?style=for-the-badge&logo=leaflet)](#)

*Una suite digital de nivel corporativo que interconecta Clínicas, Médicos, Farmacias, Cajeros, Repartidores y Pacientes en Nicaragua. Cuenta con soporte offline de punto de venta (POS), mapas interactivos en tiempo real (`mapcn`), trazabilidad inmutable y seguridad de doble factor (2FA).*

</div>

---

## 📋 Tabla de Contenidos

- [🚀 Características Clave (Categoría Avanzado)](#-características-clave-categoría-avanzado)
- [⚙️ Arquitectura de Base de Datos y Trazabilidad (3FN)](#-arquitectura-de-base-de-datos-y-trazabilidad-3fn)
- [🛡️ Infraestructura de Seguridad Avanzada](#️-infraestructura-de-seguridad-avanzada)
- [📡 Protocolo de Sincronización y Motor Offline](#-protocolo-de-sincronización-y-motor-offline)
- [📐 Arquitectura del Sistema](#-arquitectura-del-sistema)
- [👥 Roles y Permisos Granulares](#-roles-y-permisos-granulares)
- [🛠️ Stack Tecnológico Exacto](#️-stack-tecnológico-exacto)
- [🚀 Instalación Rápida](#-instalación-rápida)
- [🔧 Configuración de Variables de Entorno](#-configuración-de-variables-de-env)
- [📊 Cobertura y Estado de Módulos](#-cobertura-y-estado-de-módulos)

---

## 🚀 Características Clave (Categoría Avanzado)

### 🏥 Módulo Clínico
*   **Receta Digital Segura:** Emisión de recetas con códigos QR únicos de verificación y firma digital mediante PIN secreto del médico.
*   **Historial Clínico Unificado:** Acceso centralizado a los diagnósticos anteriores bajo estrictos controles de consentimiento del paciente.
*   **Modo Accesibilidad (Adulto Mayor):** Interfaz adaptativa con tipografía ampliada, alto contraste y simplificación de flujos para facilitar su uso a personas mayores.

### 💊 Punto de Venta (POS) & Inventario FEFO
*   **Facturación Offline-First:** Operación continua sin conexión a internet mediante IndexedDB y Service Workers. Sincronización diferencial automática al volver a estar online.
*   **Gestión por Lotes (FEFO):** Salida prioritaria del stock al lote con fecha de vencimiento más cercana para minimizar mermas y cumplir con la legislación de salud.
*   **Split Payments:** Cobros combinando múltiples métodos de pago (Efectivo, Tarjeta, Transferencia) en una sola transacción.

### 🛵 Logística de Entrega y Tracking GPS
*   **Courier Feed:** Panel dinámico para que repartidores acepten pedidos y reporten telemetría en tiempo real vía WebSockets (Socket.IO).
*   **Entrega Validada:** Protocolo seguro de entrega mediante escaneo de código QR o validación física de Cédula de Identidad.
*   **Routing Optimizado:** Cálculo de rutas geográficas integrando mapas interactivos personalizados con `mapcn` (MapLibre GL JS) y OpenFreeMap.

---

## ⚙️ Arquitectura de Base de Datos y Trazabilidad (3FN)

El ecosistema utiliza **Prisma ORM** sobre **PostgreSQL**, modelado bajo la **Tercera Forma Normal (3FN)** con nomenclatura física en español mediante anotaciones `@@map` y `@map`.

```mermaid
erDiagram
    usuarios ||--o| perfiles_pacientes : "perfil"
    usuarios ||--o| perfiles_medicos : "perfil"
    usuarios ||--o| perfiles_repartidores : "perfil"
    clinicas ||--o| direcciones_establecimientos : "ubicada_en"
    farmacias ||--o| direcciones_establecimientos : "ubicada_en"
    medicamentos ||--o| presentaciones : "clasificado_en"
    medicamento_principios ||--|| medicamentos : "asociado_a"
    medicamento_principios ||--|| principios_activos : "principio"
    inventarios ||--|| farmacias : "establecido_en"
    inventarios ||--|| medicamentos : "de"
    inventarios ||--o| lotes_inventario : "dividido_en"
    ventas ||--o| pagos : "liquidada_con"
    pagos ||--|| metodos_pago : "utiliza"
    pedidos_entrega ||--|| estados_envio : "estado"
```

### 🔍 Trazabilidad Pericial de Inventario
*   **Trazabilidad en Ventas (`articulos_venta`):** Cada venta física almacena de forma obligatoria el `lote_id` del lote específico del que se extrajo el producto. Esto permite rastrear de inmediato qué lote fue entregado a qué paciente en auditorías del MINSA.
*   **Trazabilidad en Movimientos (`movimientos_inventario`):** Las auditorías de stock (pérdidas, mermas, restock o ajustes manuales) se registran a nivel de lote individual.

---

## 🛡️ Infraestructura de Seguridad Avanzada

*   **Autenticación 2FA TOTP Real:** Seguridad de doble factor implementada con `otplib`. Los secretos TOTP se almacenan cifrados simétricamente con `aes-256-gcm` en la tabla `sesiones_2fa`.
*   **Acceso RBAC Granular:** Control estricto a nivel de ruta y establecimiento mediante el validador `verifyFacilityAccess()`, restringiendo accesos solo a personal activo de esa clínica o farmacia.
*   **Rate Limiting:** Limitador de velocidad global en memoria (100 req/15min para IPs anónimas, 1000/15min para usuarios autenticados). Bloqueo automático de logins por 15 minutos tras 4 intentos fallidos de autenticación.
*   **Manejo Centralizado de Errores:** Middleware global que filtra stack traces del servidor en entornos de producción y estandariza las respuestas en:
    `{ ok: false, error: { code, message, details } }`
*   **Bitácoras Inmutables (`audit_logs`):** Log de auditoría en base de datos tipo *insert-only*. No existen rutas ni funciones capaces de modificar o borrar registros una vez guardados.

---

## 📡 Protocolo de Sincronización y Motor Offline

Para dar soporte en zonas rurales de Nicaragua con conectividad inestable o nula, Oasis implementa una arquitectura híbrida de resiliencia de datos:

```
[ Cajero POS ] ── (¿Conexión?) ──► [ Sí ] ──► Servidor PostgreSQL (Venta Inmediata)
       │
       └──► [ No ] ──► Service Worker ──► IndexedDB (Cola de Ventas Pendientes)
                             ▲
                             └─► (Connectivity Restored Event) ──► SyncManager Upload
```

*   **IndexedDB & Service Workers:** Las transacciones iniciadas sin internet son capturadas por el Service Worker e indexadas localmente con identificadores únicos temporales (UUID).
*   **SyncManager Inteligente:** Al detectar el evento de ventana `'online'`, el gestor activa el barrido de cola en segundo plano.
*   **Discriminador de Errores (Red vs Validación):**
    *   Si el servidor rechaza una venta por conflicto lógico (ej. error 400 por falta de existencias de lote *INSUFFICIENT_STOCK*), el gestor la marca localmente como fallida para que el cajero la rectifique.
    *   Si la falla es por corte de red o timeout, el gestor conserva la orden en cola y detiene la secuencia para no agotar los recursos del cliente, reanudando de forma segura en la próxima ventana activa.

---

## 📐 Arquitectura del Sistema

```mermaid
graph TB
    subgraph Client["🌐 CLIENTE (PWA)"]
        UI["Next.js App Router<br/>React 19 UI"]
        SW["Service Worker<br/>Cache + Push"]
        IDB[("IndexedDB<br/>Local Storage")]
        Sync["Sync Manager<br/>Auto-sync"]
    end

    subgraph Gateway["🔒 GATEWAY & SEGURIDAD"]
        Auth["JWT Middleware<br/>2FA + Verify"]
        RBAC["RBAC Granular<br/>Control de Establecimientos"]
        RateLimit["Rate Limiter<br/>IP & User Limiting"]
    end

    subgraph Backend["⚙️ BACKEND (API)"]
        Routes["API Routes<br/>Next.js Handlers"]
        Services["Services Layer<br/>Lógica de Negocio"]
    end

    subgraph Data["💾 CAPA DE DATOS"]
        Prisma["Prisma ORM<br/>Type-Safe Queries"]
        PostgreSQL[("PostgreSQL / Supabase<br/>BD Normalizada 3FN")]
    end

    UI --> SW
    UI --> IDB
    UI --> Sync
    Sync --> Auth
    Auth --> RBAC
    RBAC --> RateLimit
    RateLimit --> Routes
    Routes --> Services
    Services --> Prisma
    Prisma --> PostgreSQL
```

---

## 👥 Roles y Permisos Granulares

| Rol | Icono | Descripción | Capacidad Clave |
| :--- | :---: | :--- | :--- |
| **Admin Global** | 👑 | Control supremo de la plataforma | Gestión global de establecimientos, reportes periciales, altas |
| **Admin Clínica** | 🏥 | Administrador del establecimiento clínico | Invitar personal, configurar tarifas y auditar expedientes |
| **Admin Farmacia** | 💊 | Administrador del establecimiento farmacéutico | Alta de inventarios locales, lotes y precios |
| **Doctor** | 🩺 | Profesional de la salud | Consulta médica, recetas digitales con PIN y QR |
| **Recepcionista** | 📝 | Control operativo de turnos | Agendamiento, registro inicial y validación |
| **Cajero POS** | 🛒 | Cajero de punto de venta | Facturación síncrona/asíncrona (offline) y cobros |
| **Repartidor** | 🛵 | Logística de entrega a domicilio | GPS en vivo, feed de encargos y confirmación por QR/cédula |
| **Paciente** | 👤 | Usuario beneficiario | Agendar citas, visualizar recetas y tracking en vivo |
| **Auditor** | 🔎 | Perfil regulatorio externo | Acceso de solo lectura a la bitácora inmutable de auditoría |

---

## 🛠️ Stack Tecnológico Exacto

*   **Runtime:** Node.js 18+ (Recomendado 20 LTS)
*   **Framework Backend:** Next.js 15.1.1 (API Routes)
*   **Framework Frontend:** Next.js 15.1.1 (App Router)
*   **Lenguaje:** TypeScript 5+
*   **ORM:** Prisma 6.11.1
*   **Base de Datos:** PostgreSQL 14+ (local o Supabase)
*   **Estilos:** Tailwind CSS 3 + Sileo (notificaciones premium con física de resortes y morphing SVG)
*   **Mapas:** MapLibre GL 5.24.0 + Componentes `mapcn`
*   **Validación:** Zod 4.0.2
*   **Tiempo Real:** Socket.IO 4.8.3 (GPS courier)
*   **Alertas y Push:** Firebase Admin SDK + Firebase Cloud Messaging

---

## 🚀 Instalación Rápida

### 1. Clonar el Repositorio
```bash
git clone https://github.com/FlasheyEstudi/Oasis-Nicaragua.git
cd Oasis-Nicaragua
```

### 2. Configurar Base de Datos y Backend
```bash
cd Backend
npm install
cp .env.example .env
# Configura DATABASE_URL en tu archivo .env
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev # Backend activo en http://localhost:8000
```

### 3. Configurar Frontend
```bash
cd ../Frontend
npm install
cp .env.local.example .env.local
# Configura NEXT_PUBLIC_API_BASE_URL en tu archivo .env.local
npm run dev # Frontend activo en http://localhost:3000
```

---

## 🔧 Configuración de Variables de Entorno

### Backend (`/Backend/.env`)
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/oasis?schema=public"
DIRECT_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/oasis?schema=public"
OSRM_BASE_URL="http://localhost:5000"
JWT_SECRET="tu_secreto_jwt_seguro"
JWT_ACCESS_SECRET="tu_secreto_access_jwt_seguro"
JWT_REFRESH_SECRET="tu_secreto_refresh_jwt_seguro"
FIREBASE_ADMIN_PROJECT_ID="oasis-fcm"
```

### Frontend (`/Frontend/.env.local`)
```bash
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:8000"
NEXT_PUBLIC_MAP_STYLE="https://tiles.openfreemap.org/styles/liberty"
```

---

## 📊 Cobertura y Estado de Módulos

| Módulo | Estado | Completitud | Observación / Avance |
| :--- | :---: | :---: | :--- |
| **Core Auth & Roles** | ✅ | 100% | Login multi-perfil, validación de sesión y JWT |
| **Autenticación 2FA** | ✅ | 100% | TOTP en backend con otplib y cifrado AES-256 |
| **Base de Datos 3FN** | ✅ | 100% | Normalizada a 3FN en PostgreSQL con Prisma |
| **Flujo Clínico (Recetas QR)** | ✅ | 100% | Citas médicas, recetas cifradas con firma PIN |
| **Punto de Venta POS** | ✅ | 100% | Caja con cobros compuestos (Split Payments) |
| **POS Offline Engine** | ✅ | 100% | Cola transaccional IndexedDB y Service Workers |
| **Driver & Delivery GPS** | ✅ | 100% | WebSockets para tracking en vivo de motorizados |
| **UI Liquid Glass** | ✅ | 100% | Diseño traslúcido premium con contraste WCAG AA |
| **Trazabilidad de Lotes** | ✅ | 100% | Auditable en ventas y movimientos de inventario |
| **Manual de Identidad** | ✅ | 100% | Documento PDF y guías de marca corporativa |

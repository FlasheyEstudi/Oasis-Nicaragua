'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Terminal, Cpu, Network, Play, Copy, Check, RefreshCw,
  Server, Shield, Lock, Unlock, FileJson, Activity, Search,
  Zap, Heart, LayoutGrid, CheckCircle2, AlertTriangle, ArrowRight,
  ShieldCheck, Github, ChevronRight, Globe, BarChart3, DatabaseZap,
  CheckCircle, HelpCircle, Sliders, Plug, Flame, Info, XCircle,
  ArrowUpRight, Layers, Radio, BookOpen, FileText, X
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

/* ─────────────────────────────────────────────
   TEXTOS CAPÍTULO POR CAPÍTULO PARA EL VISOR DE DOCUMENTACIÓN INTERACTIVA (Oasis Nicaragua)
   ───────────────────────────────────────────── */
const DOC_CHAPTERS = [
  {
    id: 'intro',
    title: '1. Visión General del Negocio',
    icon: Heart,
    subtitle: 'El ecosistema digital avanzado de Oasis Nicaragua',
    content: `Oasis Nicaragua es un ecosistema digital unificado de salud, farmacias y logística de última milla desarrollado específicamente para la realidad y el marco regulatorio nicaragüense.

• Pacientes: Cuentan con un portal PWA simplificado para agendar citas médicas, visualizar recetas electrónicas con códigos QR y configurar la delegación de cuidadores familiares para la compra de medicamentos controlados.
• Clínicas privadas: Administran consultas, expedientes clínicos y la firma digital de recetas utilizando un PIN de seguridad por médico.
• Farmacias independientes: Disponen de un Punto de Venta (POS) con soporte offline-first (IndexedDB) que sincroniza automáticamente las ventas y arqueos de caja en NIO/USD al volver a estar online.
• Logística (Repartidores): Panel optimizado para motorizados que transmiten su ubicación GPS en tiempo real e interactúan con mapas libres de OpenFreeMap.`
  },
  {
    id: 'architecture',
    title: '2. Arquitectura de Red y Supabase',
    icon: Network,
    subtitle: 'Persistencia distribuida y comunicación',
    content: `La topografía de Oasis Nicaragua garantiza resiliencia ante la inestabilidad de la red celular local:

1. Backend Serverless (Vercel/Render):
   Alojamiento CDN de baja latencia. Los endpoints REST /api/v1/* están protegidos por el validador de establecimiento verifyFacilityAccess().
2. PgBouncer Connection Pooling:
   En producción, Prisma se comunica con Supabase PostgreSQL utilizando el Connection Pooler (puerto 6543 en modo transacción) para evitar el agotamiento de sockets.
3. Real-Time Live Feed (Socket.IO):
   Un servidor de WebSockets dedicado difunde la telemetría GPS de los motorizados en ruta directamente al mapa del paciente.`
  },
  {
    id: 'fefo',
    title: '3. Algoritmo de Lotes (FEFO / FIFO)',
    icon: Database,
    subtitle: 'Trazabilidad pericial del inventario',
    content: `El inventario farmacéutico se divide en lotes físicos (lotes_inventario) para cumplir con el Ministerio de Salud (MINSA):

1. Algoritmo FEFO (First Expired, First Out):
   El backend de Oasis despacha automáticamente los productos del lote con la fecha de vencimiento más cercana, excluyendo de inmediato los lotes expirados.
2. Kardex Digital:
   Todos los movimientos se auditan con el tipo de operación (sale, restock, adjustment) garantizando la rastreabilidad de lote a paciente en auditorías.`
  },
  {
    id: 'security',
    title: '4. Seguridad Avanzada y 2FA TOTP',
    icon: Shield,
    subtitle: 'Mitigación y protección criptográfica',
    content: `Oasis Nicaragua implementa tres capas críticas de seguridad activa:

1. Autenticación 2FA TOTP Real:
   Generación de secretos compatibles con Google Authenticator cifrados simétricamente con aes-256-gcm en la tabla de sesiones de la BD.
2. Bitácora Append-Only:
   La tabla audit_logs es inmutable, capturando el ID de usuario, IP real (x-forwarded-for), dispositivo y acción realizada.
3. Shield de Rate Limiting:
   Limitador deslizante en memoria que bloquea IPs anónimas tras 100 req/15min e IPs sospechosas tras 4 intentos fallidos de login durante 15 minutos.`
  }
];

const API_ROUTES = [
  // Autenticación
  { method: 'POST', path: '/api/v1/auth/login', category: 'Autenticación', desc: 'Login principal con bloqueo por fuerza bruta.', auth: false, body: '{\n  "email": "doctor@oasis.com.ni",\n  "password": "secretPassword"\n}' },
  { method: 'POST', path: '/api/v1/auth/register', category: 'Autenticación', desc: 'Registro de usuarios con roles granulares RBAC.', auth: false, body: '{\n  "name": "Pedro Pérez",\n  "email": "pedro@gmail.com",\n  "password": "secure123",\n  "role": "patient"\n}' },
  { method: 'POST', path: '/api/v1/auth/refresh', category: 'Autenticación', desc: 'Rotación y renovación de tokens de sesión.', auth: false, body: '{\n  "refresh_token": "jwt-refresh-token-string"\n}' },
  { method: 'POST', path: '/api/v1/auth/logout', category: 'Autenticación', desc: 'Invalida la sesión actual en cookies y base de datos.', auth: true },
  { method: 'POST', path: '/api/v1/auth/2fa/setup', category: 'Seguridad', desc: 'Genera el código QR para configurar TOTP 2FA.', auth: true },
  { method: 'POST', path: '/api/v1/auth/2fa/verify', category: 'Seguridad', desc: 'Verifica y activa el doble factor en la cuenta.', auth: true, body: '{\n  "code": "123456"\n}' },
  
  // Citas y Clínicas
  { method: 'GET', path: '/api/v1/appointments', category: 'Clínica', desc: 'Listado de citas médicas con filtros de fecha.', auth: true },
  { method: 'POST', path: '/api/v1/appointments', category: 'Clínica', desc: 'Agendar cita médica previniendo solapamiento de 2 horas.', auth: true, body: '{\n  "doctor_id": "cuid-doctor",\n  "clinic_id": "cuid-clinic",\n  "date_time": "2026-07-08T10:00:00Z",\n  "duration_minutes": 30\n}' },
  
  // POS y Ventas
  { method: 'POST', path: '/api/v1/pharmacies/[id]/sales', category: 'POS', desc: 'Procesar cobros POS con exención de IVA y descuento adult. mayor (Ley 160).', auth: true, body: '{\n  "items": [{ "medicine_id": "cuid-med", "quantity": 2 }],\n  "payments": [{ "amount": 150.0, "method": "cash", "currency": "NIO" }]\n}' },
  { method: 'POST', path: '/api/v1/pharmacies/[id]/reconciliations', category: 'POS', desc: 'Arqueo de caja inmutable calculando faltantes y sobrantes.', auth: true, body: '{\n  "cash_reported": 1250.0,\n  "card_reported": 800.0\n}' },
  { method: 'GET', path: '/api/v1/sales/[id]/receipt', category: 'Reportes', desc: 'Generar comprobante/factura de venta en formato PDF.', auth: true },
  
  // Logística y Reparto
  { method: 'POST', path: '/api/v1/delivery/[id]/status', category: 'Repartos', desc: 'Actualizar estado físico del delivery y cancelar venta si aplica.', auth: true, body: '{\n  "status": "delivered",\n  "notes": "Entregado a portería"\n}' },
  { method: 'POST', path: '/api/v1/delivery/[id]/route-gps', category: 'Repartos', desc: 'Transmitir coordenadas GPS de motorizados.', auth: true, body: '{\n  "latitude": 12.1364,\n  "longitude": -86.2514\n}' },
  { method: 'POST', path: '/api/v1/delivery/[id]/verify', category: 'Repartos', desc: 'Validar y completar entrega por código QR del paciente.', auth: true, body: '{\n  "qr_content": "delivery-verification-hash-code"\n}' },
  
  // Relaciones Familiares y Cuidadores
  { method: 'POST', path: '/api/v1/family', category: 'Familia', desc: 'Solicitar vinculación familiar con código de consentimiento expirable.', auth: true, body: '{\n  "patient_id": "patient-cuid",\n  "relationship": "hijo"\n}' },
  { method: 'PATCH', path: '/api/v1/family/permissions', category: 'Familia', desc: 'Actualizar permisos delegados al cuidador (solo pacientes).', auth: true, body: '{\n  "permissions": ["buy_medication", "view_prescriptions"]\n}' },
  
  // Chats y Sistema
  { method: 'GET', path: '/api/v1/chats', category: 'Chats', desc: 'Listar salas de chat activas.', auth: true },
  { method: 'GET', path: '/api/v1/health', category: 'Sistema', desc: 'Health check del backend y latencia de base de datos.', auth: false },
  { method: 'GET', path: '/api/v1/cron', category: 'Sistema', desc: 'Cron job para desencadenar recordatorios de medicamentos.', auth: false },
];

const DB_TABLES = [
  {
    name: 'User',
    purpose: 'Usuario del ecosistema. Vincula credenciales, rol RBAC, estado 2FA y FCM token.',
    columns: [
      { name: 'id', type: 'String (CUID)', desc: 'Identificador único autogenerado' },
      { name: 'email', type: 'String (Único)', desc: 'Correo electrónico institucional o personal' },
      { name: 'passwordHash', type: 'String', desc: 'Contraseña encriptada con Bcrypt' },
      { name: 'role', type: 'String', desc: 'Rol granular: patient, doctor, pharmacist, driver, admin' },
      { name: 'fcmToken', type: 'String (Nulo)', desc: 'Token de mensajería FCM para notificaciones' },
      { name: 'isActive', type: 'Boolean', desc: 'Control de desactivación lógica de la cuenta' }
    ]
  },
  {
    name: 'MedicationReminder',
    purpose: 'Recordatorios de dosis de pacientes enlazados a líneas de receta.',
    columns: [
      { name: 'id', type: 'String (CUID)', desc: 'ID del recordatorio' },
      { name: 'userId', type: 'String (FK)', desc: 'Relación con el Paciente (usuarios.id)' },
      { name: 'medicineName', type: 'String', desc: 'Nombre comercial o genérico del medicamento' },
      { name: 'scheduledTime', type: 'String (HH:MM)', desc: 'Hora programada en formato 24 horas' },
      { name: 'status', type: 'String (active/paused)', desc: 'Estado del recordatorio' }
    ]
  },
  {
    name: 'DeliveryOrder',
    purpose: 'Envíos de medicamentos en moto vinculados a las ventas POS.',
    columns: [
      { name: 'id', type: 'String (CUID)', desc: 'ID del pedido de entrega' },
      { name: 'saleId', type: 'String (FK)', desc: 'Relación con la venta original' },
      { name: 'deliveryDriverId', type: 'String (FK)', desc: 'Relación con el repartidor asignado' },
      { name: 'statusId', type: 'String (FK)', desc: 'Relación con el catálogo de estados' },
      { name: 'deliveryAddress', type: 'String', desc: 'Dirección física completa del destino' }
    ]
  },
  {
    name: 'FamilyRelationship',
    purpose: 'Vínculos de cuidadores familiares y autorizaciones delegadas.',
    columns: [
      { name: 'id', type: 'String (CUID)', desc: 'ID de la relación' },
      { name: 'caregiverId', type: 'String (FK)', desc: 'Usuario que actúa como tutor' },
      { name: 'patientId', type: 'String (FK)', desc: 'Paciente que delega la compra' },
      { name: 'isActive', type: 'Boolean', desc: 'Indica si la relación familiar está vigente' },
      { name: 'permissions', type: 'String[]', desc: 'Arreglo de permisos (ej. ver_recetas, comprar_lotes)' }
    ]
  }
];

const METRICS_DATA = [
  { time: '08:00', requests: 120, latency: 18, cpu: 12, memory: 45 },
  { time: '10:00', requests: 280, latency: 24, cpu: 22, memory: 48 },
  { time: '12:00', requests: 450, latency: 32, cpu: 38, memory: 52 },
  { time: '14:00', requests: 380, latency: 28, cpu: 30, memory: 54 },
  { time: '16:00', requests: 620, latency: 45, cpu: 56, memory: 61 },
  { time: '18:00', requests: 890, latency: 54, cpu: 78, memory: 68 },
  { time: '20:00', requests: 510, latency: 38, cpu: 44, memory: 64 },
  { time: '22:00', requests: 240, latency: 22, cpu: 18, memory: 58 }
];

const VOLUMES_DATA = [
  { name: 'User', registros: 1240 },
  { name: 'MedicationReminder', registros: 890 },
  { name: 'DeliveryOrder', registros: 2310 },
  { name: 'FamilyRelationship', registros: 420 }
];

const FLOATING_PARTICLES = [
  { id: 1, size: 8, x: 20, y: 15, duration: 12, delay: 0 },
  { id: 2, size: 16, x: 80, y: 10, duration: 18, delay: 2 },
  { id: 3, size: 10, x: 50, y: 70, duration: 14, delay: 4 },
  { id: 4, size: 12, x: 10, y: 80, duration: 16, delay: 1 },
  { id: 5, size: 6, x: 85, y: 60, duration: 10, delay: 3 }
];

export default function Home() {
  const [copiedRoute, setCopiedRoute] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'api' | 'db'>('api');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [activeTable, setActiveTable] = useState<string>('User');
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [activeDocChapter, setActiveDocChapter] = useState('intro');
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  
  // Live Telemetry
  const [telemetry, setTelemetry] = useState({
    cpu: 28,
    memory: 52,
    latency: 26,
    sockets: 18,
    dbPool: 8,
    fcmStatus: 'ACTIVE'
  });
  
  // Terminal logs state
  const [terminalLogs, setTerminalLogs] = useState<Array<{ text: string; type: 'cmd' | 'ok' | 'err' | 'info' | 'output' }>>([
    { text: 'Oasis Nicaragua Backend Engine [Versión 2.0.0]', type: 'info' },
    { text: 'Conexión con Supabase PostgreSQL: ESTABLECIDA (PgBouncer puerto 6543)', type: 'ok' },
    { text: 'Inicializado Firebase Cloud Messaging SDK para alertas push.', type: 'info' },
    { text: 'Escribe comandos o haz clic en los botones inferiores para probar la API.', type: 'info' },
  ]);
  const [isTesting, setIsTesting] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Simulate server fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        cpu: Math.max(10, Math.min(95, prev.cpu + Math.floor(Math.random() * 11) - 5)),
        memory: Math.max(40, Math.min(85, prev.memory + Math.floor(Math.random() * 5) - 2)),
        latency: Math.max(12, Math.min(80, prev.latency + Math.floor(Math.random() * 9) - 4)),
        sockets: Math.max(5, Math.min(50, prev.sockets + Math.floor(Math.random() * 5) - 2)),
        dbPool: Math.max(2, Math.min(25, prev.dbPool + Math.floor(Math.random() * 3) - 1)),
        fcmStatus: 'ACTIVE'
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Diagnostic endpoints mock functions
  const runHealthCheck = async () => {
    if (isTesting) return;
    setIsTesting(true);
    setTerminalLogs(prev => [
      ...prev,
      { text: 'GET /api/v1/health', type: 'cmd' },
      { text: 'Comprobando estado del servidor, base de datos y latencias...', type: 'info' }
    ]);

    try {
      // Intentar llamada real pero si falla, hacer mock de respuesta elegante
      const response = await fetch('/api/v1/health').catch(() => null);
      if (response) {
        const data = await response.json();
        setTerminalLogs(prev => [
          ...prev,
          { text: `HTTP ${response.status} - OK`, type: 'ok' },
          { text: JSON.stringify(data, null, 2), type: 'output' }
        ]);
      } else {
        // Mock fallback
        setTimeout(() => {
          setTerminalLogs(prev => [
            ...prev,
            { text: 'HTTP 200 - OK (SIMULADO)', type: 'ok' },
            { text: JSON.stringify({
              status: "UP",
              uptime: `${Math.floor(process.uptime() || 3450)}s`,
              database: { status: "CONNECTED", provider: "postgresql", latency: `${telemetry.latency}ms` },
              services: { firebase: "CONNECTED", openFreeMap: "OK" }
            }, null, 2), type: 'output' }
          ]);
          setIsTesting(false);
        }, 800);
        return;
      }
    } catch (err: any) {
      setTerminalLogs(prev => [
        ...prev,
        { text: 'HTTP 503 - Fallo de conexión', type: 'err' },
        { text: `Detalle: ${err.message || 'Servicio no responde'}`, type: 'err' }
      ]);
    } finally {
      setIsTesting(false);
    }
  };

  const runCronTest = async () => {
    if (isTesting) return;
    setIsTesting(true);
    setTerminalLogs(prev => [
      ...prev,
      { text: 'GET /api/v1/cron?secret=oasis_cron_super_secret_token_123', type: 'cmd' },
      { text: 'Ejecutando cron job de verificación de vencimientos y alertas push...', type: 'info' }
    ]);

    try {
      const response = await fetch('/api/v1/cron?secret=oasis_cron_super_secret_token_123').catch(() => null);
      if (response) {
        const data = await response.json();
        setTerminalLogs(prev => [
          ...prev,
          { text: `HTTP ${response.status} - OK`, type: 'ok' },
          { text: JSON.stringify(data, null, 2), type: 'output' }
        ]);
      } else {
        setTimeout(() => {
          setTerminalLogs(prev => [
            ...prev,
            { text: 'HTTP 200 - OK (SIMULADO)', type: 'ok' },
            { text: JSON.stringify({
              job: "alerts_scheduler",
              processed_reminders: 14,
              dispatched_push_notifications: 8,
              deactivated_expired_batches: 2,
              timestamp: new Date().toISOString()
            }, null, 2), type: 'output' }
          ]);
          setIsTesting(false);
        }, 900);
        return;
      }
    } catch (err: any) {
      setTerminalLogs(prev => [
        ...prev,
        { text: 'Fallo al ejecutar Cron Job', type: 'err' },
        { text: `Detalle: ${err.message || 'Error de conexión'}`, type: 'err' }
      ]);
    } finally {
      setIsTesting(false);
    }
  };

  const runGeoSearch = async () => {
    if (isTesting) return;
    setIsTesting(true);
    setTerminalLogs(prev => [
      ...prev,
      { text: 'GET /api/v1/geo/search?q=Managua', type: 'cmd' },
      { text: 'Buscando coordenadas geográficas en OpenFreeMap...', type: 'info' }
    ]);

    try {
      const response = await fetch('/api/v1/geo/search?q=Managua').catch(() => null);
      if (response) {
        const data = await response.json();
        setTerminalLogs(prev => [
          ...prev,
          { text: `HTTP ${response.status} - OK`, type: 'ok' },
          { text: JSON.stringify(data, null, 2), type: 'output' }
        ]);
      } else {
        setTimeout(() => {
          setTerminalLogs(prev => [
            ...prev,
            { text: 'HTTP 200 - OK (SIMULADO)', type: 'ok' },
            { text: JSON.stringify({
              query: "Managua",
              results: [
                { name: "Managua, Nicaragua", latitude: 12.1364, longitude: -86.2514, type: "city" },
                { name: "Villa Fontana, Managua", latitude: 12.1154, longitude: -86.2625, type: "suburb" }
              ]
            }, null, 2), type: 'output' }
          ]);
          setIsTesting(false);
        }, 750);
        return;
      }
    } catch (err: any) {
      setTerminalLogs(prev => [
        ...prev,
        { text: 'Error al buscar ubicación', type: 'err' },
        { text: `Detalle: ${err.message}`, type: 'err' }
      ]);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyRoute = (path: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopiedRoute(path);
    setTimeout(() => setCopiedRoute(null), 2000);
  };

  const filteredRoutes = API_ROUTES.filter(route => {
    const matchesSearch = route.path.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          route.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || route.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#03070f] text-white flex flex-col font-sans relative overflow-x-hidden antialiased">
      
      {/* 🔮 Background Abstract Glowing Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-cyan-600/[0.04] blur-[150px]" />
        <div className="absolute top-1/4 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-600/[0.03] blur-[130px]" />
        <div className="absolute -bottom-40 left-1/3 w-[800px] h-[800px] rounded-full bg-emerald-600/[0.04] blur-[160px]" />
      </div>

      {/* Grid Pattern Background */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(6,182,212,0.8) 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }}
      />

      {/* Floating Particles */}
      {FLOATING_PARTICLES.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-cyan-400 opacity-20 animate-pulse pointer-events-none z-0"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            filter: 'blur(1px)'
          }}
        />
      ))}

      {/* 🚀 Header */}
      <header className="border-b border-white/[0.06] bg-[#050a15]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center border border-cyan-400/20 shadow-lg shadow-cyan-500/10">
              <span className="text-white font-extrabold text-lg">ON</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Oasis Nicaragua <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-bold tracking-wide">BACKEND CONSOLE</span>
              </h1>
              <p className="text-xs text-white/50">Consola Avanzada de Salud, Farmacias y Logística de Distribución</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-300 font-mono font-semibold shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              <span>LIVE CORE</span>
            </div>

            <button
              onClick={() => setIsDocOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition-all text-xs font-semibold"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Ver Documentación</span>
            </button>
            <a
              href="https://github.com/FlasheyEstudi/Oasis-Nicaragua"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/[0.06] text-white/70 hover:text-white transition-all text-xs font-medium"
            >
              <Github className="w-4 h-4" />
              <span>Repositorio</span>
            </a>
          </div>
        </div>
      </header>

      {/* 📊 Server Stats & Telemetry */}
      <section className="max-w-7xl mx-auto px-6 pt-8 w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 z-10">
        
        {/* CPU */}
        <div className="bg-[#070f1e]/60 border border-white/[0.06] rounded-xl p-4 flex flex-col gap-1 backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex justify-between items-center text-white/40 text-xs font-semibold">
            <span>Uso de CPU</span>
            <Cpu className="w-4 h-4 text-cyan-400/80 group-hover:scale-110 transition-all" />
          </div>
          <span className="text-xl font-bold font-mono tracking-tight text-white mt-1">{telemetry.cpu}%</span>
          <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
            <motion.div className="h-full bg-cyan-500" animate={{ width: `${telemetry.cpu}%` }} transition={{ duration: 0.8 }} />
          </div>
        </div>

        {/* Memory */}
        <div className="bg-[#070f1e]/60 border border-white/[0.06] rounded-xl p-4 flex flex-col gap-1 backdrop-blur-md relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="flex justify-between items-center text-white/40 text-xs font-semibold">
            <span>Memoria RAM</span>
            <Server className="w-4 h-4 text-indigo-400/80 group-hover:scale-110 transition-all" />
          </div>
          <span className="text-xl font-bold font-mono tracking-tight text-white mt-1">{telemetry.memory}%</span>
          <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
            <motion.div className="h-full bg-indigo-500" animate={{ width: `${telemetry.memory}%` }} transition={{ duration: 0.8 }} />
          </div>
        </div>

        {/* Latency */}
        <div className="bg-[#070f1e]/60 border border-white/[0.06] rounded-xl p-4 flex flex-col gap-1 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex justify-between items-center text-white/40 text-xs font-semibold">
            <span>Latencia DB</span>
            <Activity className="w-4 h-4 text-emerald-400/80 group-hover:scale-110 transition-all" />
          </div>
          <span className="text-xl font-bold font-mono tracking-tight text-white mt-1">{telemetry.latency} ms</span>
          <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
            <motion.div className="h-full bg-emerald-500" animate={{ width: `${(telemetry.latency / 100) * 100}%` }} transition={{ duration: 0.8 }} />
          </div>
        </div>

        {/* Active Sockets */}
        <div className="bg-[#070f1e]/60 border border-white/[0.06] rounded-xl p-4 flex flex-col gap-1 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex justify-between items-center text-white/40 text-xs font-semibold">
            <span>Sockets (GPS)</span>
            <Radio className="w-4 h-4 text-amber-400/80 group-hover:scale-110 transition-all animate-pulse" />
          </div>
          <span className="text-xl font-bold font-mono tracking-tight text-white mt-1">{telemetry.sockets} motoristas</span>
          <span className="text-[10px] text-amber-400/70 font-semibold tracking-wide">Transmisión GPS activa</span>
        </div>

        {/* DB Pool */}
        <div className="bg-[#070f1e]/60 border border-white/[0.06] rounded-xl p-4 flex flex-col gap-1 backdrop-blur-md relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="flex justify-between items-center text-white/40 text-xs font-semibold">
            <span>Pool Conexiones</span>
            <DatabaseZap className="w-4 h-4 text-purple-400/80 group-hover:scale-110 transition-all" />
          </div>
          <span className="text-xl font-bold font-mono tracking-tight text-white mt-1">{telemetry.dbPool} / 100</span>
          <span className="text-[10px] text-purple-400/70 font-semibold tracking-wide">PgBouncer (Transaction)</span>
        </div>

        {/* Firebase FCM */}
        <div className="bg-[#070f1e]/60 border border-white/[0.06] rounded-xl p-4 flex flex-col gap-1 backdrop-blur-md relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="flex justify-between items-center text-white/40 text-xs font-semibold">
            <span>Firebase FCM</span>
            <Plug className="w-4 h-4 text-rose-400/80 group-hover:scale-110 transition-all" />
          </div>
          <span className="text-xl font-bold font-mono tracking-tight text-emerald-400 mt-1 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>ACTIVO</span>
          </span>
          <span className="text-[10px] text-white/40 font-semibold tracking-wide">Listo para notificaciones push</span>
        </div>

      </section>

      {/* 📈 Charts Section */}
      <section className="max-w-7xl mx-auto px-6 pt-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 z-10">
        
        {/* Latency & Requests area chart */}
        <div className="lg:col-span-7 bg-[#070f1e]/60 border border-white/[0.06] rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Tráfico de Red y Latencia del Sistema</span>
              </h3>
              <p className="text-[11px] text-white/40">Carga acumulada y tiempos de respuesta de base de datos</p>
            </div>
            <div className="flex gap-3 text-[10px] font-mono text-white/60">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-cyan-500 rounded-sm" /> Peticiones</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm" /> Latencia (ms)</span>
            </div>
          </div>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={METRICS_DATA} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#091223', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 11 }} />
                <Area type="monotone" dataKey="requests" name="Peticiones" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#cyanGrad)" />
                <Area type="monotone" dataKey="latency" name="Latencia DB (ms)" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#indigoGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Database Record Volumes */}
        <div className="lg:col-span-5 bg-[#070f1e]/60 border border-white/[0.06] rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Volumen de Datos Registrados</span>
              </h3>
              <p className="text-[11px] text-white/40">Cantidad de registros auditados en el esquema Prisma 3FN</p>
            </div>
            <DatabaseZap className="w-4 h-4 text-emerald-400/80" />
          </div>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={VOLUMES_DATA} barSize={36} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#091223', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 11 }} />
                <Bar dataKey="registros" radius={[4, 4, 0, 0]}>
                  {VOLUMES_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#059669'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </section>

      {/* 🎮 Main Console & Visualizer Grid */}
      <main className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 z-10">
        
        {/* Left Column: Terminal Diagnostics & Database Visualizer */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Interactive Diagnostic Terminal */}
          <div className="bg-[#070f1e]/80 border border-white/[0.06] rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span className="font-mono text-sm font-semibold tracking-wide">Terminal de Pruebas de API</span>
              </div>
              <button 
                onClick={() => setTerminalLogs([{ text: 'Consola limpia.', type: 'info' }])}
                className="text-[10px] text-white/40 hover:text-white transition-all px-2.5 py-1 border border-white/10 hover:border-white/20 rounded font-semibold font-mono"
              >
                Limpiar logs
              </button>
            </div>

            {/* Terminal Monitor Output Screen */}
            <div className="bg-[#03060c] rounded-xl p-4 font-mono text-xs h-64 overflow-y-auto border border-cyan-500/10 leading-relaxed shadow-inner select-text scrollbar-thin">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="mb-2.5">
                  {log.type === 'cmd' && <span className="text-cyan-400 font-bold">$ {log.text}</span>}
                  {log.type === 'ok' && <span className="text-emerald-400">✓ {log.text}</span>}
                  {log.type === 'err' && <span className="text-rose-500 font-semibold">✗ {log.text}</span>}
                  {log.type === 'info' && <span className="text-white/40">• {log.text}</span>}
                  {log.type === 'output' && (
                    <pre className="text-amber-300/90 mt-1.5 pl-4 overflow-x-auto bg-[#070f1e]/90 p-2.5 rounded border border-white/[0.03]">
                      {log.text}
                    </pre>
                  )}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Buttons for live execution */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={runHealthCheck}
                disabled={isTesting}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-cyan-300 transition-all font-bold text-xs"
              >
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Ejecutar Health Check</span>
              </button>
              <button
                onClick={runCronTest}
                disabled={isTesting}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 transition-all font-bold text-xs"
              >
                <RefreshCw className={`w-4 h-4 text-indigo-400 ${isTesting ? 'animate-spin' : ''}`} />
                <span>Alertas Cron Job</span>
              </button>
              <button
                onClick={runGeoSearch}
                disabled={isTesting}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 transition-all font-bold text-xs"
              >
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Geocodificación Local</span>
              </button>
            </div>

          </div>

          {/* Database visualizer */}
          <div className="bg-[#070f1e]/80 border border-white/[0.06] rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-sm">Explorador de Base de Datos (Prisma 3FN)</span>
              </div>
              <span className="text-[10px] text-white/40 font-mono font-semibold">Tercera Forma Normal</span>
            </div>

            {/* Model Select Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DB_TABLES.map(t => (
                <button
                  key={t.name}
                  onClick={() => setActiveTable(t.name)}
                  className={`text-xs font-semibold py-2 px-3 rounded-lg transition-all border ${
                    activeTable === t.name
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-500/5'
                      : 'border-white/5 bg-[#0a1426]/30 text-white/50 hover:bg-[#0a1426]/60 hover:text-white'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Selected table structure */}
            <AnimatePresence mode="wait">
              {DB_TABLES.filter(t => t.name === activeTable).map(t => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#040810] p-4 rounded-xl border border-white/[0.04] flex flex-col gap-3"
                >
                  <div>
                    <h4 className="text-xs text-white/80 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Modelo: {t.name}</span>
                    </h4>
                    <p className="text-[11px] text-white/50 mt-1 leading-relaxed">{t.purpose}</p>
                  </div>
                  
                  <div className="text-[11px] font-mono grid grid-cols-1 gap-2.5 mt-1 border-t border-white/5 pt-3">
                    {t.columns.map((c, i) => (
                      <div key={i} className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/[0.02] pb-2 gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold">{c.name}</span>
                          <span className="text-[9px] bg-white/5 text-white/40 px-1.5 py-0.2 rounded">{c.type}</span>
                        </div>
                        <span className="text-white/40 text-[10px]">{c.desc}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

          </div>

        </section>

        {/* Right Column: Searchable API Router Catalog */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="bg-[#070f1e]/80 border border-white/[0.06] rounded-2xl p-6 shadow-xl backdrop-blur-md flex-1 flex flex-col min-h-[500px]">
            
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <FileJson className="w-5 h-5 text-cyan-400" />
                <span>Catálogo de APIs de Oasis</span>
              </span>
              <span className="text-[10px] text-white/40 font-mono font-semibold">{API_ROUTES.length} endpoints</span>
            </div>

            {/* Search filter controls */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-white/30 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar endpoint o descripción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#040810] border border-white/10 rounded-lg text-xs text-white/90 placeholder-white/45 focus:outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>
              
              {/* Category tags horizontal slider */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin">
                {['Todos', 'Autenticación', 'Seguridad', 'Clínica', 'POS', 'Repartos', 'Familia', 'Sistema'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-[10px] px-3 py-1 rounded-full transition-all shrink-0 font-semibold border ${
                      selectedCategory === cat
                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        : 'bg-[#0a1426]/30 text-white/50 border-white/5 hover:text-white hover:bg-[#0a1426]/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable list of API Endpoints */}
            <div className="flex-1 overflow-y-auto max-h-[460px] pr-1 space-y-3 scrollbar-thin">
              <AnimatePresence>
                {filteredRoutes.map((route, idx) => (
                  <div 
                    key={idx} 
                    className="bg-[#03060c] p-3 rounded-xl border border-white/[0.04] flex flex-col gap-2 hover:border-white/[0.08] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black font-mono px-2 py-0.5 rounded ${
                          route.method === 'POST' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/10' :
                          route.method === 'PATCH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                          route.method === 'DELETE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                        }`}>
                          {route.method}
                        </span>
                        <span className="text-[11px] font-mono text-white/80 font-bold select-all">{route.path}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {route.body && (
                          <button
                            onClick={() => setExpandedRoute(expandedRoute === route.path ? null : route.path)}
                            className="text-white/40 hover:text-cyan-400 transition-all text-[10px] font-semibold px-1 py-0.5 rounded bg-white/5"
                            title="Ver ejemplo de JSON"
                          >
                            JSON
                          </button>
                        )}
                        <button
                          onClick={() => handleCopyRoute(route.path)}
                          className="text-white/40 hover:text-white transition-all p-0.5 hover:bg-white/5 rounded"
                          title="Copiar URL completa"
                        >
                          {copiedRoute === route.path ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-[11px] text-white/50 leading-normal font-medium">{route.desc}</p>
                    
                    {/* Expandable JSON Body Example */}
                    {expandedRoute === route.path && route.body && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <pre className="text-[9px] font-mono text-amber-200/90 bg-[#070f1e] p-2.5 rounded border border-white/5 mt-1 overflow-x-auto leading-normal whitespace-pre">
                          {route.body}
                        </pre>
                      </motion.div>
                    )}
                  </div>
                ))}
              </AnimatePresence>
              
              {filteredRoutes.length === 0 && (
                <div className="text-center text-xs text-white/40 mt-8 py-4 border border-dashed border-white/5 rounded-xl">
                  No se encontraron endpoints.
                </div>
              )}
            </div>

          </div>

        </section>

      </main>

      {/* 🌿 Footer */}
      <footer className="border-t border-white/[0.06] bg-[#050a15]/40 py-6 text-center text-xs text-white/40 z-10 relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>Oasis Nicaragua Backend Engine © 2026. Todos los derechos reservados.</p>
          <p className="text-[10px] text-cyan-400/60 font-mono font-bold tracking-wide">
            Supabase PostgreSQL • Firebase Admin SDK • MapLibre GL API • Socket.IO Sockets
          </p>
        </div>
      </footer>

      {/* 📚 Documentation interactive Modal */}
      <AnimatePresence>
        {isDocOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-[#070e1b] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            >
              
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06] bg-[#050a15]">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold text-sm tracking-wide">Manual de Referencia del Desarrollador</span>
                </div>
                <button 
                  onClick={() => setIsDocOpen(false)}
                  className="text-white/40 hover:text-white transition-all p-1 hover:bg-white/5 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                
                {/* Sidebar Navigation Tabs */}
                <div className="w-full md:w-64 bg-[#050a15]/40 border-r border-white/[0.06] overflow-y-auto p-3 flex flex-row md:flex-col gap-1.5 scrollbar-none">
                  {DOC_CHAPTERS.map(ch => {
                    const Icon = ch.icon;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => setActiveDocChapter(ch.id)}
                        className={`w-full text-left text-xs font-semibold py-2.5 px-3 rounded-lg flex items-center gap-2 transition-all ${
                          activeDocChapter === ch.id
                            ? 'bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20'
                            : 'text-white/60 hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0 text-cyan-400" />
                        <span className="truncate">{ch.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Content Panel */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#040810]/40 text-white/90 text-sm leading-relaxed whitespace-pre-line scrollbar-thin">
                  {DOC_CHAPTERS.filter(ch => ch.id === activeDocChapter).map(ch => (
                    <div key={ch.id}>
                      <h3 className="text-lg font-black text-cyan-400 mb-1 tracking-tight">{ch.title}</h3>
                      <p className="text-xs text-white/40 mb-5 font-semibold tracking-wide">{ch.subtitle}</p>
                      
                      <div className="markdown-doc text-xs text-white/80 space-y-4 font-normal">
                        {ch.content}
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

-- ===========================================================================
-- Base de Datos: Oasis Nicaragua (3FN)
-- Proyecto: Sistema Digital de Salud, Farmacias y Logística
-- Motor: PostgreSQL 14+
-- ===========================================================================

-- 1. Catálogos e Independientes (Sin dependencias externas)
CREATE TABLE direcciones_establecimientos (
    id VARCHAR(30) PRIMARY KEY,
    direccion TEXT NOT NULL,
    latitud DOUBLE PRECISION NOT NULL,
    longitud DOUBLE PRECISION NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE principios_activos (
    id VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(255) UNIQUE NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE presentaciones (
    id VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(255) UNIQUE NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE metodos_pago (
    id VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(255) UNIQUE NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE estados_envio (
    id VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(255) UNIQUE NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE especialidades_medicas (
    id VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(255) UNIQUE NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE configuraciones_globales (
    clave VARCHAR(255) PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE tokens_recuperacion_password (
    id VARCHAR(30) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    hash_token TEXT NOT NULL,
    expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
    usado BOOLEAN DEFAULT FALSE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_reset_email ON tokens_recuperacion_password(email);
CREATE INDEX idx_reset_token ON tokens_recuperacion_password(hash_token);

-- 2. Entidad Central de Usuarios
CREATE TABLE usuarios (
    id VARCHAR(30) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    rol VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    email_verificado BOOLEAN DEFAULT FALSE NOT NULL,
    fcm_token TEXT,
    estado_verificacion VARCHAR(50) DEFAULT 'pending' NOT NULL,
    limite_verificacion TIMESTAMP WITH TIME ZONE,
    documentos_legales TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- 3. Perfiles de Usuario Relacionados (1:1)
CREATE TABLE perfiles_pacientes (
    usuario_id VARCHAR(30) PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_nacimiento VARCHAR(50),
    grupo_sanguineo VARCHAR(10),
    alergias TEXT,
    notas_medicas TEXT,
    contacto_emergencia VARCHAR(255),
    telefono_emergencia VARCHAR(50),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE configuraciones_usuario (
    id VARCHAR(30) PRIMARY KEY,
    usuario_id VARCHAR(30) UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tema VARCHAR(50) DEFAULT 'system' NOT NULL,
    notificaciones_activadas BOOLEAN DEFAULT TRUE NOT NULL,
    preferencias_notificaciones JSONB DEFAULT '{}'::jsonb NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE sesiones_2fa (
    id VARCHAR(30) PRIMARY KEY,
    usuario_id VARCHAR(30) REFERENCES usuarios(id) ON DELETE CASCADE,
    secreto VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT FALSE NOT NULL,
    intentos INTEGER DEFAULT 0 NOT NULL,
    bloqueado_hasta TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE tokens_refresh (
    id VARCHAR(30) PRIMARY KEY,
    usuario_id VARCHAR(30) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    hash_token VARCHAR(255) UNIQUE NOT NULL,
    expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
    revocado_en TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE tokens_push (
    id VARCHAR(30) PRIMARY KEY,
    usuario_id VARCHAR(30) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    informacion_dispositivo TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Establecimientos (Clínicas y Farmacias)
CREATE TABLE clinicas (
    id VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    direccion_id VARCHAR(30) NOT NULL REFERENCES direcciones_establecimientos(id),
    telefono VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    propietario_id VARCHAR(30),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_clinicas_activo ON clinicas(activo);

CREATE TABLE configuraciones_clinica (
    id VARCHAR(30) PRIMARY KEY,
    clinica_id VARCHAR(30) UNIQUE NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    tarifa_consulta_base DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    tasa_impuesto DOUBLE PRECISION DEFAULT 0.15 NOT NULL,
    permisos_defecto TEXT[] DEFAULT '{"view_health_data","buy_medicines","schedule_appointments"}'::text[] NOT NULL,
    preferencias_notificaciones JSONB DEFAULT '{}'::jsonb NOT NULL,
    aseguradoras_asociadas TEXT[] DEFAULT '{}'::text[] NOT NULL,
    horario_operacion JSONB DEFAULT '{}'::jsonb NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE farmacias (
    id VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    direccion_id VARCHAR(30) NOT NULL REFERENCES direcciones_establecimientos(id),
    telefono VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    tarifa_envio DOUBLE PRECISION DEFAULT 29.90 NOT NULL,
    propietario_id VARCHAR(30),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_farmacias_activo ON farmacias(activo);

CREATE TABLE configuraciones_farmacia (
    id VARCHAR(30) PRIMARY KEY,
    farmacia_id VARCHAR(30) UNIQUE NOT NULL REFERENCES farmacias(id) ON DELETE CASCADE,
    tasa_iva_defecto DOUBLE PRECISION DEFAULT 0.15 NOT NULL,
    pie_ticket TEXT DEFAULT '¡Gracias por su compra!'::text,
    serie_factura VARCHAR(50) DEFAULT 'A' NOT NULL,
    umbral_alerta_stock_minimo INTEGER DEFAULT 10 NOT NULL,
    dias_alerta_vencimiento INTEGER DEFAULT 90 NOT NULL,
    tarifa_envio_por_km DOUBLE PRECISION DEFAULT 15.0 NOT NULL,
    radio_cobertura_envio_km DOUBLE PRECISION DEFAULT 10.0 NOT NULL,
    rol_cajero_defecto VARCHAR(50) DEFAULT 'cashier' NOT NULL,
    rol_repartidor_defecto VARCHAR(50) DEFAULT 'delivery_driver' NOT NULL,
    preferencias_notificaciones JSONB DEFAULT '{}'::jsonb NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Relaciones de Personal a Establecimientos
CREATE TABLE perfiles_medicos (
    usuario_id VARCHAR(30) PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    clinica_id VARCHAR(30) NOT NULL REFERENCES clinicas(id),
    especialidad_defecto VARCHAR(255) DEFAULT 'Medicina General' NOT NULL,
    numero_licencia VARCHAR(255) UNIQUE NOT NULL,
    pin_firma VARCHAR(10),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE especialidades_perfil_medico (
    medico_id VARCHAR(30) NOT NULL REFERENCES perfiles_medicos(usuario_id) ON DELETE CASCADE,
    especialidad_id VARCHAR(30) NOT NULL REFERENCES especialidades_medicas(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (medico_id, especialidad_id)
);

CREATE TABLE perfiles_administradores_farmacia (
    usuario_id VARCHAR(30) PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    farmacia_id VARCHAR(30) REFERENCES farmacias(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE perfiles_repartidores (
    usuario_id VARCHAR(30) PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    farmacia_id VARCHAR(30) REFERENCES farmacias(id),
    tipo_vehiculo VARCHAR(50) DEFAULT 'motocicleta' NOT NULL,
    placa_licencia VARCHAR(50),
    disponible BOOLEAN DEFAULT TRUE NOT NULL,
    latitud_actual DOUBLE PRECISION,
    longitud_actual DOUBLE PRECISION,
    tipo_empleo VARCHAR(50) DEFAULT 'contractor' NOT NULL,
    salario_base DOUBLE PRECISION,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE perfiles_recepcionistas (
    usuario_id VARCHAR(30) PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    clinica_id VARCHAR(30) REFERENCES clinicas(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Productos e Inventario
CREATE TABLE medicamentos (
    id VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    presentacion_id VARCHAR(30) NOT NULL REFERENCES presentaciones(id),
    concentracion VARCHAR(255),
    requiere_receta BOOLEAN DEFAULT TRUE NOT NULL,
    tipo_control VARCHAR(50) DEFAULT 'NORMAL' NOT NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_medicamentos_nombre ON medicamentos(nombre);

CREATE TABLE medicamento_principios (
    medicamento_id VARCHAR(30) NOT NULL REFERENCES medicamentos(id) ON DELETE CASCADE,
    principio_activo_id VARCHAR(30) NOT NULL REFERENCES principios_activos(id) ON DELETE CASCADE,
    PRIMARY KEY (medicamento_id, principio_activo_id)
);

CREATE TABLE inventarios (
    id VARCHAR(30) PRIMARY KEY,
    farmacia_id VARCHAR(30) NOT NULL REFERENCES farmacias(id) ON DELETE CASCADE,
    medicamento_id VARCHAR(30) NOT NULL REFERENCES medicamentos(id) ON DELETE CASCADE,
    cantidad INTEGER DEFAULT 0 NOT NULL,
    stock_minimo INTEGER DEFAULT 10 NOT NULL,
    precio_unitario DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (farmacia_id, medicamento_id)
);

CREATE TABLE lotes_inventario (
    id VARCHAR(30) PRIMARY KEY,
    inventario_id VARCHAR(30) NOT NULL REFERENCES inventarios(id) ON DELETE CASCADE,
    numero_lote VARCHAR(255) NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_costo DOUBLE PRECISION,
    precio_venta DOUBLE PRECISION,
    fecha_vencimiento TIMESTAMP WITH TIME ZONE,
    proveedor VARCHAR(255),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_lotes_expiracion ON lotes_inventario(fecha_vencimiento);

CREATE TABLE movimientos_inventario (
    id VARCHAR(30) PRIMARY KEY,
    inventario_id VARCHAR(30) NOT NULL REFERENCES inventarios(id) ON DELETE CASCADE,
    usuario_id VARCHAR(30) REFERENCES usuarios(id) ON DELETE SET NULL,
    lote_id VARCHAR(30) REFERENCES lotes_inventario(id) ON DELETE SET NULL,
    tipo VARCHAR(50) NOT NULL, -- restock, sale, adjustment, in, out
    cambio_cantidad INTEGER NOT NULL,
    motivo TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Flujo Clínico (Citas y Recetas)
CREATE TABLE citas (
    id VARCHAR(30) PRIMARY KEY,
    paciente_id VARCHAR(30) NOT NULL REFERENCES usuarios(id),
    medico_id VARCHAR(30) NOT NULL REFERENCES usuarios(id),
    clinica_id VARCHAR(30) NOT NULL REFERENCES clinicas(id),
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    duracion_minutos INTEGER DEFAULT 30 NOT NULL,
    estado VARCHAR(50) DEFAULT 'scheduled' NOT NULL,
    motivo_cancelacion TEXT,
    notas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE recetas (
    id VARCHAR(30) PRIMARY KEY,
    paciente_id VARCHAR(30) NOT NULL REFERENCES usuarios(id),
    medico_id VARCHAR(30) NOT NULL REFERENCES usuarios(id),
    clinica_id VARCHAR(30) NOT NULL REFERENCES clinicas(id),
    cita_id VARCHAR(30) REFERENCES citas(id),
    estado VARCHAR(50) DEFAULT 'active' NOT NULL,
    codigo_qr VARCHAR(255) UNIQUE,
    codigo_verificacion VARCHAR(255) UNIQUE,
    firma_digital TEXT,
    notas TEXT,
    emitida_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_expiracion VARCHAR(50) NOT NULL,
    surtida_en TIMESTAMP WITH TIME ZONE,
    farmacia_surtido_id VARCHAR(30) REFERENCES farmacias(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE lineas_receta (
    id VARCHAR(30) PRIMARY KEY,
    receta_id VARCHAR(30) NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
    medicamento_id VARCHAR(30) NOT NULL REFERENCES medicamentos(id),
    cantidad INTEGER NOT NULL,
    instrucciones_dosis TEXT NOT NULL,
    cantidad_surtida INTEGER DEFAULT 0 NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Ventas, Pagos y Despacho (POS y Delivery)
CREATE TABLE ventas (
    id VARCHAR(30) PRIMARY KEY,
    farmacia_id VARCHAR(30) REFERENCES farmacias(id),
    clinica_id VARCHAR(30) REFERENCES clinicas(id),
    paciente_id VARCHAR(30) REFERENCES usuarios(id),
    receta_id VARCHAR(30) REFERENCES recetas(id),
    cita_id VARCHAR(30) UNIQUE REFERENCES citas(id),
    es_envio BOOLEAN DEFAULT FALSE NOT NULL,
    direccion_envio TEXT,
    latitud_envio DOUBLE PRECISION,
    longitud_envio DOUBLE PRECISION,
    notas_envio TEXT,
    estado VARCHAR(50) DEFAULT 'pending' NOT NULL,
    monto_total DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE articulos_venta (
    id VARCHAR(30) PRIMARY KEY,
    venta_id VARCHAR(30) NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    medicamento_id VARCHAR(30) NOT NULL REFERENCES medicamentos(id),
    lote_id VARCHAR(30) REFERENCES lotes_inventario(id) ON DELETE SET NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario DOUBLE PRECISION NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE pagos (
    id VARCHAR(30) PRIMARY KEY,
    venta_id VARCHAR(30) REFERENCES ventas(id) ON DELETE CASCADE,
    monto DOUBLE PRECISION NOT NULL,
    moneda VARCHAR(10) NOT NULL,
    metodo_pago_id VARCHAR(30) NOT NULL REFERENCES metodos_pago(id),
    estado VARCHAR(50) NOT NULL,
    id_transaccion VARCHAR(255),
    notas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE pedidos_entrega (
    id VARCHAR(30) PRIMARY KEY,
    venta_id VARCHAR(30) UNIQUE NOT NULL REFERENCES ventas(id),
    farmacia_id VARCHAR(30) NOT NULL REFERENCES farmacias(id),
    repartidor_id VARCHAR(30) REFERENCES usuarios(id),
    paciente_id VARCHAR(30) NOT NULL REFERENCES usuarios(id),
    direccion_recoleccion TEXT NOT NULL,
    latitud_recoleccion DOUBLE PRECISION NOT NULL,
    longitud_recoleccion DOUBLE PRECISION NOT NULL,
    direccion_entrega TEXT NOT NULL,
    latitud_entrega DOUBLE PRECISION NOT NULL,
    longitud_entrega DOUBLE PRECISION NOT NULL,
    estado_envio_id VARCHAR(30) NOT NULL REFERENCES estados_envio(id),
    asignado_en TIMESTAMP WITH TIME ZONE,
    recolectado_en TIMESTAMP WITH TIME ZONE,
    entregado_en TIMESTAMP WITH TIME ZONE,
    notas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE rutas_entrega (
    id VARCHAR(30) PRIMARY KEY,
    pedido_entrega_id VARCHAR(30) NOT NULL REFERENCES pedidos_entrega(id) ON DELETE CASCADE,
    latitud_repartidor DOUBLE PRECISION NOT NULL,
    longitud_repartidor DOUBLE PRECISION NOT NULL,
    registrado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. Comunicaciones, Notificaciones y Extras
CREATE TABLE notificaciones (
    id VARCHAR(30) PRIMARY KEY,
    usuario_id VARCHAR(30) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    cuerpo TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    enlace TEXT,
    leido BOOLEAN DEFAULT FALSE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE recordatorios_medicacion (
    id VARCHAR(30) PRIMARY KEY,
    usuario_id VARCHAR(30) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    linea_receta_id VARCHAR(30) NOT NULL REFERENCES lineas_receta(id) ON DELETE CASCADE,
    nombre_medicamento VARCHAR(255) NOT NULL,
    instrucciones_dosis TEXT NOT NULL,
    hora_programada VARCHAR(10) NOT NULL,
    estado VARCHAR(50) DEFAULT 'pending' NOT NULL,
    ultima_notificacion TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE bitacoras_auditoria (
    id VARCHAR(30) PRIMARY KEY,
    usuario_id VARCHAR(30) REFERENCES usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(255) NOT NULL,
    tipo_entidad VARCHAR(255) NOT NULL,
    id_entidad VARCHAR(255),
    detalles TEXT,
    direccion_ip VARCHAR(50),
    agente_usuario TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

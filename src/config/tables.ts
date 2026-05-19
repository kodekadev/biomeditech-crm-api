export type ResourceName =
  | "leads"
  | "clientes"
  | "productos"
  | "catalogo"
  | "plantillas"
  | "cotizaciones"
  | "servicios-cotizacion"
  | "comunicaciones"
  | "usuarios"
  | "actividad-dashboard";

export type TableConfig = {
  resource: ResourceName;
  table: string;
  idPrefix: string;
  fields: readonly string[];
  required: readonly string[];
  filters: readonly string[];
  searchable: readonly string[];
  orderBy: string;
  hasUpdatedAt?: boolean;
};

const common = ["id", "creado_en", "_fecha_particion"] as const;

export const tables: Record<ResourceName, TableConfig> = {
  leads: {
    resource: "leads",
    table: "leads",
    idPrefix: "L",
    fields: [
      ...common,
      "nombre",
      "empresa",
      "email",
      "telefono",
      "canal",
      "estado",
      "servicio_interes",
      "urgencia",
      "notas",
      "gestionado_por",
      "gestionado_en",
      "cliente_id"
    ],
    required: ["nombre", "canal", "estado"],
    filters: ["estado", "canal", "urgencia", "servicio_interes", "gestionado_por", "cliente_id"],
    searchable: ["nombre", "empresa", "email", "telefono", "servicio_interes"],
    orderBy: "creado_en"
  },
  clientes: {
    resource: "clientes",
    table: "clientes",
    idPrefix: "C",
    fields: [
      ...common,
      "lead_id",
      "rut",
      "nombre_empresa",
      "contacto_nombre",
      "contacto_cargo",
      "email",
      "email_facturacion",
      "telefono",
      "telefono_alt",
      "rubro",
      "tipo_cliente",
      "ciudad",
      "region",
      "comuna",
      "direccion",
      "estado",
      "creado_por",
      "actualizado_en"
    ],
    required: ["nombre_empresa", "estado"],
    filters: ["estado", "rubro", "tipo_cliente", "ciudad", "region", "creado_por"],
    searchable: ["id", "rut", "nombre_empresa", "contacto_nombre", "email", "telefono", "ciudad"],
    orderBy: "creado_en",
    hasUpdatedAt: true
  },
  catalogo: {
    resource: "catalogo",
    table: "catalogo_servicios",
    idPrefix: "CAT",
    fields: [
      ...common,
      "codigo",
      "categoria",
      "servicio",
      "equipo",
      "unidad",
      "precio_neto",
      "grupo",
      "texto_base_key",
      "descripcion_larga",

      "activo"
    ],
    required: ["codigo", "categoria"],
    filters: ["categoria", "grupo", "activo", "texto_base_key"],
    searchable: ["codigo", "servicio", "equipo", "categoria", "grupo"],
    orderBy: "codigo"
  },
  plantillas: {
    resource: "plantillas",
    table: "plantillas_descripcion",
    idPrefix: "PLT",
    fields: [...common, "codigo", "descripcion_larga"],
    required: ["codigo", "descripcion_larga"],
    filters: ["codigo"],
    searchable: ["codigo", "descripcion_larga"],
    orderBy: "codigo"
  },
  productos: {
    resource: "productos",
    table: "productos",
    idPrefix: "P",
    fields: [
      ...common,
      "nombre",
      "descripcion_larga",
      "categoria",
      "subcategoria",
      "marca",
      "modelo",
      "precio_diagnostico",
      "precio_reparacion",
      "precio_mantencion",
      "precio_instalacion",
      "precio_capacitacion",
      "diagnostico_gratis_si_acepta",
      "dias_diagnostico",
      "dias_reparacion",
      "dias_mantencion",
      "dias_instalacion",
      "notas_tecnicas",
      "activo",
      "creado_por",
      "actualizado_en"
    ],
    required: ["nombre", "activo"],
    filters: ["categoria", "subcategoria", "marca", "activo", "creado_por"],
    searchable: ["id", "nombre", "marca", "modelo", "categoria"],
    orderBy: "creado_en",
    hasUpdatedAt: true
  },
  cotizaciones: {
    resource: "cotizaciones",
    table: "cotizaciones",
    idPrefix: "Q",
    fields: [
      ...common,
      "numero",
      "version",
      "lead_id",
      "cliente_id",
      "creado_por",
      "estado",
      "subtotal_neto",
      "iva",
      "total_con_iva",
      "moneda",
      "forma_pago",
      "plazo_entrega_dias",
      "validez_dias",
      "revisiones_incluidas",
      "diagnostico_incluido",
      "notas_cliente",
      "notas_internas",
      "emitida_en",
      "enviada_en",
      "vence_en",
      "aprobada_en",
      "rechazada_en",
      "motivo_rechazo",
      "actualizado_en"
    ],
    required: ["numero", "cliente_id", "estado"],
    filters: ["estado", "cliente_id", "lead_id", "creado_por"],
    searchable: ["id", "numero", "cliente_id", "notas_cliente", "notas_internas"],
    orderBy: "creado_en",
    hasUpdatedAt: true
  },
  "servicios-cotizacion": {
    resource: "servicios-cotizacion",
    table: "servicios_cotizacion",
    idPrefix: "SC",
    fields: [
      ...common,
      "cotizacion_id",
      "producto_id",
      "linea_numero",
      "descripcion",
      "descripcion_larga",
      "tipo_servicio",
      "precio_unitario",
      "cantidad",
      "descuento_pct",
      "subtotal",
      "dias_estimados"
    ],
    required: ["cotizacion_id", "descripcion", "tipo_servicio", "precio_unitario", "cantidad", "subtotal"],
    filters: ["cotizacion_id", "producto_id", "tipo_servicio"],
    searchable: ["descripcion", "cotizacion_id", "producto_id"],
    orderBy: "linea_numero"
  },
  comunicaciones: {
    resource: "comunicaciones",
    table: "comunicaciones",
    idPrefix: "COM",
    fields: [
      ...common,
      "tipo",
      "direccion",
      "lead_id",
      "cliente_id",
      "cotizacion_id",
      "asunto",
      "destinatario",
      "remitente",
      "contenido_resumen",
      "estado_envio",
      "error_detalle",
      "enviado_por",
      "enviado_en"
    ],
    required: ["tipo", "direccion", "destinatario", "enviado_en"],
    filters: ["tipo", "direccion", "lead_id", "cliente_id", "cotizacion_id", "estado_envio", "enviado_por"],
    searchable: ["asunto", "destinatario", "remitente", "contenido_resumen"],
    orderBy: "enviado_en"
  },
  usuarios: {
    resource: "usuarios",
    table: "usuarios",
    idPrefix: "U",
    fields: [...common, "nombre_completo", "email", "telefono", "rol", "activo", "ultimo_acceso"],
    required: ["nombre_completo", "email", "rol", "activo"],
    filters: ["rol", "activo"],
    searchable: ["id", "nombre_completo", "email", "telefono", "rol"],
    orderBy: "creado_en"
  },
  "actividad-dashboard": {
    resource: "actividad-dashboard",
    table: "actividad_dashboard",
    idPrefix: "ACT",
    fields: [
      ...common,
      "tipo",
      "titulo",
      "descripcion",
      "referencia_id",
      "referencia_tipo",
      "usuario_id"
    ],
    required: ["tipo", "titulo"],
    filters: ["tipo", "referencia_tipo", "referencia_id", "usuario_id"],
    searchable: ["titulo", "descripcion", "referencia_id"],
    orderBy: "creado_en"
  }
};

export const getTableConfig = (resource: string): TableConfig | undefined => {
  return tables[resource as ResourceName];
};

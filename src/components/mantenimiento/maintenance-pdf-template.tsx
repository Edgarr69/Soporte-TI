// PDF generado automáticamente al crear una solicitud de mantenimiento
// Formato corporativo — replica Orden de Servicio de Mantenimiento BWS

import {
  Document, Page, Text, View, StyleSheet, Image, Font,
} from '@react-pdf/renderer'

import { MaintenanceType } from '@/lib/types'

Font.registerHyphenationCallback((w) => [w])

const BORDER  = '#888888'
const HEADER_BG = '#5a5a5a'
const WHITE   = '#ffffff'
const BLACK   = '#111111'
const GRAY_BG = '#e8e8e8'

const s = StyleSheet.create({
  page: {
    fontFamily:        'Helvetica',
    fontSize:          8,
    color:             BLACK,
    paddingTop:        20,
    paddingBottom:     20,
    paddingHorizontal: 24,
  },

  // ── Header ──────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    border:        `1px solid ${BORDER}`,
    marginBottom:  0,
  },
  headerLogoBox: {
    width:          110,
    borderRight:    `1px solid ${BORDER}`,
    padding:        8,
    alignItems:     'center',
    justifyContent: 'center',
  },
  logo: {
    width:     90,
    height:    45,
    objectFit: 'contain',
  },
  headerTitleBox: {
    flex:           1,
    padding:        8,
    alignItems:     'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize:   11,
    fontFamily: 'Helvetica-Bold',
    textAlign:  'center',
  },
  headerFolioBox: {
    width:          90,
    borderLeft:     `1px solid ${BORDER}`,
    padding:        8,
    justifyContent: 'flex-end',
    alignItems:     'flex-end',
  },
  folioLabel: { fontSize: 7.5, color: '#555555' },
  folioValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },

  // ── Barra de sección ────────────────────────────────────
  sectionBar: {
    backgroundColor: HEADER_BG,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  sectionBarText: {
    color:      WHITE,
    fontFamily: 'Helvetica-Bold',
    fontSize:   8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Tabla de datos (celdas con borde) ───────────────────
  dataTable: {
    border:        `1px solid ${BORDER}`,
    borderTop:     0,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottom:  `1px solid ${BORDER}`,
  },
  dataRowLast: {
    flexDirection: 'row',
  },
  dataCell: {
    borderRight:   `1px solid ${BORDER}`,
    paddingVertical:   3,
    paddingHorizontal: 5,
    flex: 1,
    flexDirection: 'row',
  },
  dataCellLast: {
    paddingVertical:   3,
    paddingHorizontal: 5,
    flex: 1,
    flexDirection: 'row',
  },
  dataCellFull: {
    paddingVertical:   3,
    paddingHorizontal: 5,
    flexDirection: 'column',
  },
  dataLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize:   8,
    marginRight: 4,
    flexShrink: 0,
  },
  dataValue: {
    fontSize: 8,
    flex: 1,
  },
  dataValueFull: {
    fontSize: 8,
    marginTop: 1,
  },

  // ── Celda de fotografía ─────────────────────────────────
  photoCell: {
    borderRight:   0,
    paddingVertical:   3,
    paddingHorizontal: 5,
    flex: 1,
  },
  photoLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize:   8,
    marginBottom: 2,
  },
  photoBox: {
    border:        `1px solid ${BORDER}`,
    height:        55,
    backgroundColor: GRAY_BG,
  },

  // ── Celda de descripción (más alta) ─────────────────────
  descCell: {
    borderRight:   `1px solid ${BORDER}`,
    paddingVertical:   3,
    paddingHorizontal: 5,
    flex: 1,
  },
  descLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize:   8,
    marginBottom: 2,
  },
  descValue: {
    fontSize: 8,
    lineHeight: 1.4,
  },

  // ── Tablas (material / actividades) ─────────────────────
  table: {
    border:  `1px solid ${BORDER}`,
    borderTop: 0,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottom:  `1px solid ${BORDER}`,
  },
  tableHeaderCell: {
    fontFamily:  'Helvetica-Bold',
    fontSize:    8,
    paddingVertical:   3,
    paddingHorizontal: 5,
    borderRight: `1px solid ${BORDER}`,
  },
  tableHeaderCellLast: {
    fontFamily:  'Helvetica-Bold',
    fontSize:    8,
    paddingVertical:   3,
    paddingHorizontal: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom:  `1px solid ${BORDER}`,
    minHeight:     14,
  },
  tableRowLast: {
    flexDirection: 'row',
    minHeight:     14,
  },
  tableCell: {
    fontSize:     8,
    paddingVertical:   2,
    paddingHorizontal: 5,
    borderRight:  `1px solid ${BORDER}`,
  },
  tableCellLast: {
    fontSize:     8,
    paddingVertical:   2,
    paddingHorizontal: 5,
  },

  // ── Observaciones ───────────────────────────────────────
  obsBox: {
    border:    `1px solid ${BORDER}`,
    borderTop: 0,
    padding:   5,
    flex:      1,  // llena el espacio restante de la página
  },
  obsLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize:   8,
    marginBottom: 2,
  },

  // ── Footer ──────────────────────────────────────────────
  footer: {
    position:   'absolute',
    bottom:     10,
    left:       24,
    right:      24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop:  `1px solid #cccccc`,
    paddingTop: 3,
  },
  footerText: { fontSize: 6.5, color: '#888888' },
})

// ─── Helpers ──────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

// ─── Props ────────────────────────────────────────────────

export interface MaintenancePdfData {
  folio:                  string
  type:                   MaintenanceType
  fecha_solicitud:        string
  fecha_termino_estimada: string | null
  departamento:           string
  encargado:              string
  area:                   string
  servicio:               string
  descripcion:            string
  tecnico_nombre:         string | null
  created_at:             string
  logoSrc:                string | null
  photoUrl?:              string | null  // data URL o URL pública de la foto
}

const MATERIAL_ROWS  = 5
const ACTIVIDAD_ROWS = 8

export function MaintenancePdfDocument({ data }: { data: MaintenancePdfData }) {
  const subtitulo = data.type === 'general' ? 'A EDIFICIO' : 'A MAQUINARIA'
  const generatedAt = new Date().toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <Document title={`Orden de Servicio ${data.folio}`} author="Sistema Interno">
      <Page size="LETTER" style={s.page}>

        {/* ── HEADER ── */}
        <View style={s.headerRow}>
          {/* Logo */}
          <View style={s.headerLogoBox}>
            {data.logoSrc ? (
              <Image style={s.logo} src={data.logoSrc} />
            ) : (
              <Text style={{ fontSize: 7, color: '#888888' }}>LOGO</Text>
            )}
          </View>

          {/* Título */}
          <View style={s.headerTitleBox}>
            <Text style={s.docTitle}>ORDEN DE SERVICIO DE MANTENIMIENTO</Text>
            <Text style={s.docTitle}>{subtitulo}</Text>
          </View>

          {/* Folio */}
          <View style={s.headerFolioBox}>
            <Text style={s.folioLabel}>Folio:</Text>
            <Text style={s.folioValue}>{data.folio}</Text>
          </View>
        </View>

        {/* ── DATOS GENERALES ── */}
        <View style={s.sectionBar}>
          <Text style={s.sectionBarText}>Datos Generales</Text>
        </View>

        <View style={s.dataTable}>
          {/* Fila 1: fecha solicitud | fecha termino */}
          <View style={s.dataRow}>
            <View style={s.dataCell}>
              <Text style={s.dataLabel}>Fecha de solicitud:</Text>
              <Text style={s.dataValue}>{fmtDate(data.fecha_solicitud)}</Text>
            </View>
            <View style={s.dataCellLast}>
              <Text style={s.dataLabel}>Fecha de termino:</Text>
              <Text style={s.dataValue}>{fmtDate(data.fecha_termino_estimada)}</Text>
            </View>
          </View>

          {/* Fila 2: departamento | encargado */}
          <View style={s.dataRow}>
            <View style={s.dataCell}>
              <Text style={s.dataLabel}>Departamento solicitante:</Text>
              <Text style={s.dataValue}>{data.departamento}</Text>
            </View>
            <View style={s.dataCellLast}>
              <Text style={s.dataLabel}>Encargado del departamento:</Text>
              <Text style={s.dataValue}>{data.encargado}</Text>
            </View>
          </View>

          {/* Filas 3+: área / servicio / descripción [+ seguimiento si hay foto] | fotografía */}
          {data.photoUrl ? (
            /* ── CON FOTO: foto ocupa toda la altura incluyendo seguimiento ── */
            <View style={{ flexDirection: 'row', minHeight: 200 }}>

              {/* Columna izquierda: datos + seguimiento */}
              <View style={{ flex: 1, borderRight: `1px solid ${BORDER}` }}>
                {/* Área */}
                <View style={{ borderBottom: `1px solid ${BORDER}`, paddingVertical: 3, paddingHorizontal: 5 }}>
                  <Text style={s.dataLabel}>Area afectada:</Text>
                  <Text style={s.dataValueFull}>{data.area}</Text>
                </View>
                {/* Servicio */}
                <View style={{ borderBottom: `1px solid ${BORDER}`, paddingVertical: 3, paddingHorizontal: 5 }}>
                  <Text style={s.dataLabel}>Servicio:</Text>
                  <Text style={s.dataValueFull}>{data.servicio}</Text>
                </View>
                {/* Descripción */}
                <View style={{ borderBottom: `1px solid ${BORDER}`, paddingVertical: 3, paddingHorizontal: 5, flex: 1 }}>
                  <Text style={s.descLabel}>Descripcion del servicio:</Text>
                  <Text style={s.descValue}>{data.descripcion}</Text>
                </View>
                {/* Mini barra Seguimiento */}
                <View style={{ backgroundColor: HEADER_BG, paddingVertical: 3, paddingHorizontal: 5 }}>
                  <Text style={s.sectionBarText}>Seguimiento del Servicio</Text>
                </View>
                {/* Servicio asignado */}
                <View style={{ borderBottom: `1px solid ${BORDER}`, paddingVertical: 3, paddingHorizontal: 5, flexDirection: 'row' }}>
                  <Text style={s.dataLabel}>Servicio asignado a:</Text>
                  <Text style={s.dataValue}>{data.tecnico_nombre ?? ''}</Text>
                </View>
                {/* Encargado */}
                <View style={{ paddingVertical: 3, paddingHorizontal: 5, flexDirection: 'row' }}>
                  <Text style={s.dataLabel}>Encargado del departamento:</Text>
                  <Text style={s.dataValue} />
                </View>
              </View>

              {/* Columna derecha: fotografía — llena toda la altura combinada */}
              <View style={{ width: '40%', paddingTop: 3, paddingHorizontal: 5 }}>
                <Text style={s.photoLabel}>Fotografia</Text>
                <Image
                  style={{ flex: 1, marginTop: 2, objectFit: 'contain' }}
                  src={data.photoUrl}
                />
              </View>

            </View>
          ) : (
            /* ── SIN FOTO: layout original solo área/servicio/descripción ── */
            <View style={{ flexDirection: 'row', minHeight: 100 }}>
              <View style={{ flex: 1 }}>
                {/* Área */}
                <View style={{ borderBottom: `1px solid ${BORDER}`, paddingVertical: 3, paddingHorizontal: 5 }}>
                  <Text style={s.dataLabel}>Area afectada:</Text>
                  <Text style={s.dataValueFull}>{data.area}</Text>
                </View>
                {/* Servicio */}
                <View style={{ borderBottom: `1px solid ${BORDER}`, paddingVertical: 3, paddingHorizontal: 5 }}>
                  <Text style={s.dataLabel}>Servicio:</Text>
                  <Text style={s.dataValueFull}>{data.servicio}</Text>
                </View>
                {/* Descripción */}
                <View style={{ paddingVertical: 3, paddingHorizontal: 5, flex: 1 }}>
                  <Text style={s.descLabel}>Descripcion del servicio:</Text>
                  <Text style={s.descValue}>{data.descripcion}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── SEGUIMIENTO DEL SERVICIO (solo cuando NO hay foto) ── */}
        {!data.photoUrl && (
          <>
            <View style={[s.sectionBar, { marginTop: 8 }]}>
              <Text style={s.sectionBarText}>Seguimiento del Servicio</Text>
            </View>

            <View style={s.dataTable}>
              <View style={s.dataRow}>
                <View style={{ flex: 1, paddingVertical: 3, paddingHorizontal: 5, flexDirection: 'row' }}>
                  <Text style={s.dataLabel}>Servicio asignado a:</Text>
                  <Text style={s.dataValue}>{data.tecnico_nombre ?? ''}</Text>
                </View>
              </View>
              <View style={s.dataRowLast}>
                <View style={{ flex: 1, paddingVertical: 3, paddingHorizontal: 5, flexDirection: 'row' }}>
                  <Text style={s.dataLabel}>Encargado del departamento:</Text>
                  <Text style={s.dataValue} />
                </View>
              </View>
            </View>
          </>
        )}

        {/* ── COMPRA DE MATERIAL ── */}
        <View style={[s.sectionBar, { marginTop: 8 }]}>
          <Text style={s.sectionBarText}>Compra de Material</Text>
        </View>

        <View style={s.table}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.tableHeaderCell, { width: 50 }]}>Cantidad</Text>
            <Text style={[s.tableHeaderCell, { width: 45 }]}>U.M</Text>
            <Text style={[s.tableHeaderCellLast, { flex: 1 }]}>Descripcion</Text>
          </View>
          {Array.from({ length: MATERIAL_ROWS }).map((_, i) => (
            <View key={i} style={i < MATERIAL_ROWS - 1 ? s.tableRow : s.tableRowLast}>
              <Text style={[s.tableCell, { width: 50 }]} />
              <Text style={[s.tableCell, { width: 45 }]} />
              <Text style={[s.tableCellLast, { flex: 1 }]} />
            </View>
          ))}
        </View>

        {/* ── ACTIVIDADES ── */}
        <View style={[s.sectionBar, { marginTop: 8 }]}>
          <Text style={s.sectionBarText}>Actividades</Text>
        </View>

        <View style={s.table}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.tableHeaderCell, { flex: 1 }]}> </Text>
            <Text style={[s.tableHeaderCellLast, { width: 60 }]}>ESTADO</Text>
          </View>
          {Array.from({ length: ACTIVIDAD_ROWS }).map((_, i) => (
            <View key={i} style={i < ACTIVIDAD_ROWS - 1 ? s.tableRow : s.tableRowLast}>
              <Text style={[s.tableCell, { flex: 1 }]} />
              <Text style={[s.tableCellLast, { width: 60 }]} />
            </View>
          ))}
        </View>

        {/* ── OBSERVACIONES ── */}
        <View style={[s.sectionBar, { marginTop: 8 }]}>
          <Text style={s.sectionBarText}>Observaciones</Text>
        </View>
        <View style={s.obsBox} />

        {/* ── FOOTER ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generado el {generatedAt}</Text>
          <Text style={s.footerText}>{data.folio}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber}/${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}

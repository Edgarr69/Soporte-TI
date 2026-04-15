import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { MaintenancePdfDocument } from '@/components/mantenimiento/maintenance-pdf-template'
import React from 'react'
import path from 'path'
import fs from 'fs'

export async function GET() {
  const logoPath = path.join(process.cwd(), 'public', 'logoo.png')
  let logoSrc: string | null = null
  if (fs.existsSync(logoPath)) {
    const buf = fs.readFileSync(logoPath)
    logoSrc = `data:image/png;base64,${buf.toString('base64')}`
  }

  const pdfElement = React.createElement(MaintenancePdfDocument, {
    data: {
      folio:                  'MTTO-ABR-0001',
      type:                   'general',
      fecha_solicitud:        '2025-04-15',
      fecha_termino_estimada: '2025-04-20',
      departamento:           'Producción',
      encargado:              'Juan Pérez',
      area:                   'Área de Maquinaria',
      servicio:               'Compresor de aire industrial',
      descripcion:            'Revisión general y cambio de filtros del compresor. Se detectó fuga de aire en la manguera principal que requiere reemplazo inmediato. Adicionalmente se identificaron vibraciones anómalas en el motor eléctrico, posible desalineación del eje de transmisión. Se recomienda revisión de rodamientos y ajuste de correas de transmisión. El operador reporta que el equipo pierde presión después de 20 minutos de operación continua, lo que podría indicar desgaste en los pistones o válvulas de retención.',
      tecnico_nombre:         'Carlos Ramírez',
      created_at:             new Date().toISOString(),
      logoSrc,
      photoUrl: null,
    },
  }) as unknown as Parameters<typeof renderToBuffer>[0]

  const buffer = await renderToBuffer(pdfElement)

  return new NextResponse(buffer.buffer as ArrayBuffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': 'attachment; filename="muestra-mantenimiento.pdf"',
    },
  })
}

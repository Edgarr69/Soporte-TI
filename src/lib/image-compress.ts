// Compresión de imágenes en el navegador antes de subirlas a Supabase Storage.
// Redimensiona al lado mayor MAX_DIMENSION y re-codifica como JPEG.
// Si algo falla o el resultado no es más ligero, devuelve el archivo original.

const MAX_DIMENSION = 1600
const JPEG_QUALITY  = 0.75
const COMPRESSIBLE  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    // imageOrientation respeta la rotación EXIF de las fotos de celular
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE.includes(file.type)) return file

  try {
    const { source, width, height, close } = await loadImage(file)
    const scale  = Math.min(1, MAX_DIMENSION / Math.max(width, height))
    const w      = Math.round(width * scale)
    const h      = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width  = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) { close(); return file }

    // Fondo blanco para PNG con transparencia (JPEG no tiene canal alfa)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(source, 0, 0, w, h)
    close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob || blob.size >= file.size) return file

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto'
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
  } catch (err) {
    console.warn('[compressImage] no se pudo comprimir, se sube el original:', err)
    return file
  }
}

export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage))
}

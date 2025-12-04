import { H3Event } from 'h3'
import { readFormData, createError } from 'h3'
import { writeFile } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event: H3Event) => {
  try {
    // Parse multipart formdata to get the file
    const formData = await readFormData(event)
    const file = formData.get('file') as File

    if (!file) {
      throw new Error('Aucun fichier fourni')
    }

    // Ensure the file is a CSV
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      throw new Error('Seuls les fichiers CSV sont acceptés')
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const filename = `${timestamp}_${file.name}`
    const uploadsPath = join(process.cwd(), 'public', 'uploads')
    
    // Create uploads directory if it doesn't exist
    const { mkdir } = await import('fs/promises')
    await mkdir(uploadsPath, { recursive: true })
    
    // Save file to public/uploads directory
    const buffer = await file.arrayBuffer()
    const filepath = join(uploadsPath, filename)
    await writeFile(filepath, new Uint8Array(buffer))

    return {
      success: true,
      message: 'Fichier uploadé avec succès',
      filename: file.name,
      savedAs: filename,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size
    }
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Erreur lors de l\'upload'
    })
  }
})

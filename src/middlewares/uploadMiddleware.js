// Middleware para subida y procesamiento de imagenes
const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

// Directorio base para uploads
const uploadsDir = path.join(__dirname, '../public/uploads')

// Asegurar que los directorios existan
const ensureDirectories = () => {
  const dirs = [
    path.join(uploadsDir, 'avatars'),
    path.join(uploadsDir, 'covers')
  ]

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

ensureDirectories()

// Configuracion de almacenamiento temporal en memoria
const storage = multer.memoryStorage()

// Filtro para solo permitir imagenes
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, WebP)'), false)
  }
}

// Configuracion base de multer
const uploadConfig = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5MB
  }
})

// Middleware para subir avatar
const uploadAvatar = uploadConfig.single('avatar')

// Middleware para subir portada
const uploadCover = uploadConfig.single('cover')

// Procesamiento de avatar con Sharp
const processAvatar = async (req, res, next) => {
  if (!req.file) return next()

  try {
    const filename = `avatar_${req.session.userId}_${Date.now()}.webp`
    const outputPath = path.join(uploadsDir, 'avatars', filename)

    // Redimensionar a 200x200 y convertir a webp
    await sharp(req.file.buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toFile(outputPath)

    // Guardar nombre del archivo en req para el controlador
    req.processedFile = {
      filename,
      path: outputPath
    }

    next()
  } catch (error) {
    console.error('Error al procesar avatar:', error.message)
    next(new Error('Error al procesar la imagen'))
  }
}

// Procesamiento de portada con Sharp
const processCover = async (req, res, next) => {
  if (!req.file) return next()

  try {
    const filename = `cover_${req.session.userId}_${Date.now()}.webp`
    const outputPath = path.join(uploadsDir, 'covers', filename)

    // Redimensionar a 1200x400 y convertir a webp
    await sharp(req.file.buffer)
      .resize(1200, 400, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toFile(outputPath)

    req.processedFile = {
      filename,
      path: outputPath
    }

    next()
  } catch (error) {
    console.error('Error al procesar portada:', error.message)
    next(new Error('Error al procesar la imagen'))
  }
}

// Funcion auxiliar para eliminar archivo antiguo
const deleteOldFile = async (filename, type) => {
  if (!filename) return

  const filePath = path.join(uploadsDir, type, filename)

  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath)
    }
  } catch (error) {
    console.error(`Error al eliminar archivo ${filename}:`, error.message)
  }
}

// Middleware para manejar errores de multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      req.flash('error', 'El archivo es demasiado grande. Maximo 5MB')
    } else {
      req.flash('error', 'Error al subir el archivo')
    }
    return res.redirect('back')
  }

  if (err) {
    req.flash('error', err.message)
    return res.redirect('back')
  }

  next()
}

module.exports = {
  uploadAvatar,
  uploadCover,
  processAvatar,
  processCover,
  deleteOldFile,
  handleUploadError
}

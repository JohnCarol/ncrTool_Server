const multer = require("multer")
const path = require("path")
const fs = require("fs").promises
const crypto = require("crypto")
const mysql = require("mysql2")
const { pool } = require("../config/db")
const promisePool = pool.promise()

// Configuration
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || "./uploads"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-rar-compressed",
]

// Create upload directory structure
const createUploadDirectory = async (ncrId) => {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, "0")
  const uploadDir = path.join(UPLOAD_BASE_DIR, "ncr", String(year), month, `NCR-${ncrId}`)

  try {
    await fs.mkdir(uploadDir, { recursive: true })
    return uploadDir
  } catch (error) {
    console.error("Error creating upload directory:", error)
    throw new Error("Failed to create upload directory")
  }
}

// Generate unique filename
const generateUniqueFilename = (originalFilename) => {
  const timestamp = Date.now()
  const randomString = crypto.randomBytes(8).toString("hex")
  const extension = path.extname(originalFilename)
  const baseName = path
    .basename(originalFilename, extension)
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 50)

  return `${timestamp}_${randomString}_${baseName}${extension}`
}

// Validate file
const validateFile = (file) => {
  const errors = []

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`)
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`)
  }

  return errors
}

// Multer configuration
const storage = multer.memoryStorage()

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    const errors = validateFile(file)
    if (errors.length > 0) {
      return cb(new Error(errors.join(", ")), false)
    }
    cb(null, true)
  },
})

// Save file to disk
const saveFileToDisk = async (file, uploadDir, uniqueFilename) => {
  const filePath = path.join(uploadDir, uniqueFilename)

  try {
    await fs.writeFile(filePath, file.buffer)
    return filePath
  } catch (error) {
    console.error("Error saving file to disk:", error)
    throw new Error("Failed to save file")
  }
}

// Process uploaded files
const processUploadedFiles = async (files, ncrId, userId) => {
  if (!files || files.length === 0) {
    return []
  }

  const uploadDir = await createUploadDirectory(ncrId)
  const savedFiles = []

  for (const file of files) {
    try {
      // Validate file
      const validationErrors = validateFile(file)
      if (validationErrors.length > 0) {
        console.warn(`Skipping invalid file ${file.originalname}: ${validationErrors.join(", ")}`)
        continue
      }

      // Generate unique filename
      const uniqueFilename = generateUniqueFilename(file.originalname)

      // Save file to disk
      const filePath = await saveFileToDisk(file, uploadDir, uniqueFilename)

      // Save file metadata to database
      let sql = `
        INSERT INTO ncr_attachments 
        (ncr_id, original_filename, stored_filename, file_path, file_size, mime_type, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      sql = mysql.format(sql, [ncrId, file.originalname, uniqueFilename, filePath, file.size, file.mimetype, userId])
      const [result] = await promisePool.query(sql)

      savedFiles.push({
        id: result.insertId,
        original_filename: file.originalname,
        stored_filename: uniqueFilename,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.mimetype,
      })
    } catch (error) {
      console.error(`Error processing file ${file.originalname}:`, error)
      // Continue with other files even if one fails
    }
  }

  return savedFiles
}

// Delete file
const deleteFile = async (attachmentId) => {
  try {
    // Get file info from database
    let sql = "SELECT file_path FROM ncr_attachments WHERE id = ? AND is_deleted = FALSE"
    sql = mysql.format(sql, [attachmentId])
    const [rows] = await promisePool.query(sql)

    if (rows.length === 0) {
      throw new Error("File not found")
    }

    const filePath = rows[0].file_path

    // Mark as deleted in database (soft delete)
    sql = "UPDATE ncr_attachments SET is_deleted = TRUE WHERE id = ?"
    sql = mysql.format(sql, [attachmentId])
    await promisePool.query(sql)

    // Optionally delete physical file (or move to trash)
    try {
      await fs.unlink(filePath)
    } catch (fileError) {
      console.warn(`Could not delete physical file: ${filePath}`, fileError)
      // Don't throw error - database record is marked as deleted
    }

    return true
  } catch (error) {
    console.error("Error deleting file:", error)
    throw error
  }
}

// Get file for download
const getFileForDownload = async (attachmentId) => {
  try {
    let sql = `
      SELECT original_filename, stored_filename, file_path, mime_type, file_size
      FROM ncr_attachments 
      WHERE id = ? AND is_deleted = FALSE
    `
    sql = mysql.format(sql, [attachmentId])
    const [rows] = await promisePool.query(sql)

    if (rows.length === 0) {
      throw new Error("File not found")
    }

    const fileInfo = rows[0]

    // Check if file exists on disk
    try {
      await fs.access(fileInfo.file_path)
    } catch (error) {
      throw new Error("File not found on disk")
    }

    return fileInfo
  } catch (error) {
    console.error("Error getting file for download:", error)
    throw error
  }
}

module.exports = {
  upload,
  processUploadedFiles,
  deleteFile,
  getFileForDownload,
  createUploadDirectory,
  validateFile,
}

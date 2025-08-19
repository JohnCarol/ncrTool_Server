const mysql = require("mysql2")
const { pool } = require("../config/db")
const promisePool = pool.promise()
const asyncHandler = require("express-async-handler")
const path = require("path")
const fs = require("fs").promises

const getAttachments = asyncHandler(async (req, res) => {
  const { ncrId } = req.query
  let sql = `SELECT * FROM ncr_attachments WHERE ncr_id = ? AND is_deleted = 0`
  sql = mysql.format(sql, [ncrId])
  const [result] = await promisePool.query(sql)
  const rows = result
  res.status(200).json(rows)
})

const downloadAttachment = asyncHandler(async (req, res) => {
  const { id } = req.query

  // Get attachment details from database
  let sql = `SELECT * FROM ncr_attachments WHERE id = ? AND is_deleted = 0`
  sql = mysql.format(sql, [id])

  const [result] = await promisePool.query(sql)

  if (result.length === 0) {
    return res.status(404).json({ message: "Attachment not found" })
  }

  const attachment = result[0]
  const filePath = path.join(attachment.file_path)  

  try {
    // Check if file exists
    await fs.access(filePath)

    // Set appropriate headers
    res.setHeader("Content-Disposition", `attachment; filename="${attachment.original_filename}"`)
    res.setHeader("Content-Type", attachment.mime_type || "application/octet-stream")

    // Stream the file
    const fileBuffer = await fs.readFile(filePath)
    res.send(fileBuffer)
  } catch (error) {
    console.error("File download error:", error)
    res.status(404).json({ message: "File not found on server" })
  }
})

module.exports = {
  getAttachments,
  downloadAttachment,
}

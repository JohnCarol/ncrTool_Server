const mysql = require("mysql2");
const { pool } = require("../config/db");
const promisePool = pool.promise();
const asyncHandler = require("express-async-handler");
const { upload, processUploadedFiles, getFileForDownload, deleteFile } = require("../utils/fileUpload")

const getNcr = asyncHandler(async (req, res) => {

    const { id } = req.query;

    let sql = "SELECT * FROM ncr_summary_view WHERE id = ?";
    sql = mysql.format(sql, [id]);

    let [result] = await promisePool.query(sql);
    const ncr = result[0];

    res.status(200).json(ncr);
});

const saveNcr = asyncHandler(async (req, res) => {

    const { manager_id, department, contract_no, calculated_risk_value, title, description, status, severity, risk, due_date, assigned_to, location, product_range } = req.body;

    const id = req.body.id ? parseInt(req.body.id) : null;
    const reported_by = req.user.userId;

    let assesed_by = []
    let basic_root_cause = []

    try {
        if (req.body.assesed_by) {
            assesed_by = JSON.parse(req.body.assesed_by)
        }

    } catch (e) {
        console.error("Error parsing assesed_by:", e)
    }

    try {
        if (req.body.basic_root_cause) {
            basic_root_cause = JSON.parse(req.body.basic_root_cause)
        }
    } catch (e) {
        console.error("Error parsing basic_root_cause:", e)
    }

    let sql;
    if (id) {
        sql = "UPDATE ncrs SET  title = ?, description = ?, contract_no = ?, reported_by = ?, status = ?, severity = ?, calculated_risk_value = ?, risk = ?, due_date = ?, assigned_to = ?, department_id = ?, assesed_by = ?, basic_root_cause = ?, location = ?, product_range = ? WHERE id = ?";
        sql = mysql.format(sql, [title, description, contract_no, reported_by, status, severity, calculated_risk_value, risk, due_date, assigned_to, department, assesed_by.join(","), basic_root_cause.join(","), location, product_range, id]);

    } else {

        //Get the next NCR number in format "NCR-YYYY-XXXX"
        sql = "SELECT COUNT(*) AS count FROM ncrs WHERE YEAR(created_at) = YEAR(CURDATE())";
        sql = mysql.format(sql);

        let [result] = await promisePool.query(sql);
        const count = result[0].count + 1;
        const ncr_number = `NCR-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

        sql = "INSERT INTO ncrs SET ?";
        sql = mysql.format(sql, [{ ncr_number, contract_no, department_id: department, title, description, reported_by, status, severity, calculated_risk_value, risk, due_date, assigned_to, assesed_by: assesed_by.join(","), basic_root_cause: basic_root_cause.join(","), location, product_range }]);

    }

    let [result] = await promisePool.query(sql);

    let savedFiles = []
    let ncrId = id || result.insertId;

    if (req.files && req.files.length > 0) {
        savedFiles = await processUploadedFiles(req.files, ncrId, reported_by)
    }

    if (status !== 'Draft') {

        let sqlNotify = "INSERT INTO notifications SET ?";


        let notifyData = { user_id: manager_id, ncr_id: ncrId, message: `A new NCR has been raised: ${title}`, type: 'assignment', title: `New NCR Assignment`, priority: 'High' };
        sqlNotify = mysql.format(sqlNotify, notifyData);

        await promisePool.query(sqlNotify);
    }

    res.status(200).json({ message: id ? "NCR updated successfully" : "NCR created successfully", data: { id: ncrId, attachments: savedFiles } });


});

const getTrends = asyncHandler(async (req, res) => {

    let sql = "SELECT * FROM ncr_trends_view";
    sql = mysql.format(sql);

    let [result] = await promisePool.query(sql);
    const rows = result;

    res.status(200).json(rows);
})

const getStatusDistribution = asyncHandler(async (req, res) => {

    const { userId, departmentId } = req.query

    let sql, dptQuery, userQuery

    if (!userId || !departmentId) {
        sql = "SELECT * FROM ncr_distribution_view";
    } else {
        if (userId) {
            userQuery = mysql.format(" AND user_id = ?", [userId]);
        } else if (departmentId) {
            dptQuery = mysql.format(" AND department_id = ?", [departmentId]);
        }

        sql = `WITH RECURSIVE months AS (  
            SELECT 
                DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01') as month_start,
                DATE_FORMAT(LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 11 MONTH)), '%Y-%m-%d') as month_end,
                DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%b %Y') as month_label,
                DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m') as month_key,
                11 as months_back
            
            UNION ALL
            
            SELECT 
                DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL months_back - 1 MONTH), '%Y-%m-01') as month_start,
                DATE_FORMAT(LAST_DAY(DATE_SUB(CURDATE(), INTERVAL months_back - 1 MONTH)), '%Y-%m-%d') as month_end,
                DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL months_back - 1 MONTH), '%b %Y') as month_label,
                DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL months_back - 1 MONTH), '%Y-%m') as month_key,
                months_back - 1
            FROM months 
            WHERE months_back > 0
            ),

            ncr_status_by_month AS (
            SELECT 
                m.month_key,
                m.month_label,
                m.month_start,
                m.month_end,
                COALESCE(SUM(CASE WHEN n.status = 'Open' THEN 1 ELSE 0 END), 0) as open_count,
                COALESCE(SUM(CASE WHEN n.status = 'Under Review' THEN 1 ELSE 0 END), 0) as under_review_count,
                COALESCE(SUM(CASE WHEN n.status = 'Capa Required' THEN 1 ELSE 0 END), 0) as capa_required_count,
                COALESCE(SUM(CASE WHEN n.status = 'Closed' THEN 1 ELSE 0 END), 0) as closed_count,
                COALESCE(COUNT(n.id), 0) as total_count
            FROM months m
            LEFT JOIN ncrs n ON DATE(n.created_at) BETWEEN m.month_start AND m.month_end
            ${userQuery || ""} ${dptQuery || ""}
            GROUP BY m.month_key, m.month_label, m.month_start, m.month_end
            ORDER BY m.month_start
            )

            SELECT 
            month_key,
            month_label,
            month_start,
            month_end,
            open_count,
            under_review_count,
            capa_required_count,
            closed_count,
            total_count
            FROM ncr_status_by_month;`;
    }

    let [result] = await promisePool.query(sql);
    const rows = result;

    res.status(200).json(rows);
})

const getRecentNcrs = asyncHandler(async (req, res) => {

    const { userId, departmentId } = req.query

    let sql, dptQuery, userQuery
    if (!userId || !departmentId) {
        sql = "SELECT id, ncr_number, title, status, severity, created_at FROM ncrs ORDER BY created_at DESC LIMIT 10";
    } else {
        if (userId) {
            userQuery = mysql.format(" WHERE user_id = ?", [userId]);
        } else if (departmentId) {
            dptQuery = mysql.format(" WHERE department_id = ?", [departmentId]);
        }

        sql = `SELECT id, ncr_number, title, status, severity, created_at 
               FROM ncrs 
               ${userQuery || dptQuery || ""} 
               ORDER BY created_at DESC LIMIT 10`;
    }

    let [result] = await promisePool.query(sql);
    const rows = result;

    res.status(200).json(rows);
})

const getAllNcrs = asyncHandler(async (req, res) => {

    const { userId, departmentId } = req.query

    let sql, dptQuery, userQuery
    if (!userId || !departmentId) {
        sql = "SELECT * FROM ncr_summary_view ORDER BY created_at DESC";
    } else {
        if (userId) {
            userQuery = mysql.format(" WHERE user_id = ?", [userId]);
        } else if (departmentId) {
            dptQuery = mysql.format(" WHERE department_id = ?", [departmentId]);
        }

        sql = `SELECT * 
               FROM ncr_summary_view 
               ${userQuery || dptQuery || ""} 
               ORDER BY created_at DESC`;
    }

    let [result] = await promisePool.query(sql);
    const rows = result;

    res.status(200).json(rows);
})

const updateNcrDisposition = asyncHandler(async (req, res) => {
    const { ncrId: id, disposition: disposition_id, reason: disposition_reason, reportedById, ncrNumber } = req.body;

    if (!id || !disposition_id) {
        return res.status(400).json({ message: "NCR ID and disposition are required" });
    }

    let status = disposition_id === 1 ? 'CAPA Required' : 'Draft';

    let sql = `UPDATE ncrs SET ? WHERE ?`;
    sql = mysql.format(sql, [{ disposition_id, disposition_reason, status }, { id }]);

    console.log(sql)

    await promisePool.query(sql);
    // Notify the user about the disposition update

    if (disposition_id !== 1) {
        sql = "INSERT INTO notifications SET ?";
        sql = mysql.format(sql, { user_id: reportedById, ncr_id: id, message: `You have a disposition for ${ncrNumber}. Reason : ${disposition_reason} `, type: 'disposition', title: 'New NCR Disposition', priority: 'High' });

        await promisePool.query(sql);
    }

    res.status(200).json({ message: "NCR disposition updated successfully" });
}
);

const notifyUser = asyncHandler(async (req, res) => {

    const { userId, ncrId, message } = req.body;

    if (!userId || !ncrId || !message || !priority) {
        return res.status(400).json({ message: "User ID, NCR ID, and message are required" });
    }

    let sql = "INSERT INTO notifications SET ?";
    sql = mysql.format(sql, { user_id: userId, ncr_id: ncrId, message, type: 'assignment', title: 'New NCR Assignment', priority: 'High' });

    console.log(sql)

    await promisePool.query(sql);

    res.status(200).json({ message: "Notification sent successfully" });
});




module.exports = {
    getNcr,
    notifyUser,
    saveNcr,
    getRecentNcrs,
    getTrends,
    getStatusDistribution,
    updateNcrDisposition,
    getAllNcrs
};
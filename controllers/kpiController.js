const mysql = require("mysql2");
const { pool } = require("../config/db");
const promisePool = pool.promise();
const asyncHandler = require("express-async-handler");

const getKpis = asyncHandler(async (req, res) => {

    const { type } = req.query;

    const ncrTable = type === "open" ? "ncr_open_view" : type === "closed" ? "ncr_closed_view" : type === "overdue" ? "ncr_overdue_view" : "ncr_cost_view";

    let sql = `SELECT * FROM ${ncrTable}`;

    sql = mysql.format(sql);
   

    let [result] = await promisePool.query(sql);
    const rows = result;

    res.status(200).json(rows);
})


module.exports = {
    getKpis,
};
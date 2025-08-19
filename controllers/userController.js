const mysql = require("mysql2");
const { pool } = require("../config/db");
const promisePool = pool.promise();
const toolsObj = require("../utils/tools");
const sendEmail = require("../utils/email");
const asyncHandler = require("express-async-handler");

const getUsers = asyncHandler(async (req, res) => {

    const { dpt_id: department } = req.query;
    let dptQuery;

    if (department) {
        dptQuery = mysql.format(" WHERE department_id = ? AND role_id != 3", [department]);
    }

    let sql = `SELECT * FROM users_view ${dptQuery} ORDER by first_name;`;
    
    let [result] = await promisePool.query(sql);
    const rows = result;

    res.status(200).json(rows);
})

const getReviewUsers = asyncHandler(async (req, res) => {
    const loggedInUserId = req.user.userId

    let sql = "SELECT id, name, surname, email FROM users WHERE id !=  ? ORDER BY name;";
    sql = (mysql.format(sql, [loggedInUserId]))
    let [result] = await promisePool.query(sql);

    const rows = result;

    res.status(200).json(rows);
})

const getUser = (asyncHandler(async (req, res) => {

    if (req.query.id) {
        const { id } = req.query;

        let sql = "SELECT * FROM users_view WHERE ?"
        sql = mysql.format(sql, { id }) 

        let [result] = await promisePool.query(sql);

        const rows = result;

        res.status(200).json(rows);

    } else {
        const { name, surname, department, userEmail, role: userType, userId } = req.user;
        const user = { name, surname, department, userEmail, userType, userId };

        res.json(user).status(200);
    }




}))

const updateUser = (req, res) => {

    console.log('In update user');

}

const deleteUser = (req, res) => {

    console.log('In del user');

}

module.exports = {
    getUser,
    getReviewUsers,
    updateUser,
    deleteUser,
    getUsers,
};
const mysql = require("mysql2");
const { pool } = require("../config/db");
const promisePool = pool.promise();
const toolsObj = require("../utils/tools");
const sendEmail = require("../utils/email");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

const loginUser = async (req, res) => {
    const { email, password } = req.body;

  

    try {
        let sql = "SELECT * FROM users where ?";
        sql = mysql.format(sql, [{ email }]);

      
        const [result] = await promisePool.query(sql);
        
        const [row] = result;

        if (result.length < 1) {
            
            throw new Error("Invalid credentials provided")
        }

        if (await bcrypt.compare(password, row.password_hash)) {

            const userID = row.id;
            const tokenExpiry = 18000;
            //const token = jwt.sign({ userID }, process.env.JWT_SECRET, { expiresIn: tokenExpiry })
            const token = jwt.sign({ userID }, process.env.JWT_SECRET)            
            res.status(201).json({ user: row, userID, token, tokenExpiry, auth: true });

        } else {            
            throw new Error("Invalid credentials provided")
        }

    } catch (err) {
console.log(err)
        console.log(err.message);
        res.status(409).json(err.message)
    }

}

const logoutUser = (req, res) => {
    console.log('In logout user');
}

const updateUser = async (req, res) => {
    
    const { email, fName: name, lName: surname, department, organisation, location, contactNo: contact_no, role: user_type } = req.body;

    try {
        let sql = "UPDATE users SET ? WHERE ?"
        sql = mysql.format(sql, [{ name, surname, email, department, organisation, location, contact_no, user_type }, {email}]);
         
        
        await promisePool.query(sql);

        res.status(201).json({ msg: 'User successfully updated' });
    }catch (err) {
        res.status(409).json(err.message);
    }
}



const setUser = async (req, res) => {
    const { email, fName: name, lName: surname, department, contactNo: contact_no, role: user_type } = req.body;
    const user = { email, name, surname };

    const origin = req.get('origin');

    try {

        let sql = `SELECT email from users WHERE ?`;
        sql = mysql.format(sql, [{ email }]);

        const [rows] = await promisePool.query(sql);

        if (rows.length) {
            //res.status(409).send('Email exists');
            throw new Error('Email exists')
        } else {

            const authToken = toolsObj.createAuthToken();

            sql = "INSERT INTO users SET ?";
            sql = mysql.format(sql, [{ email, name, surname, email, department, contact_no, user_type, authToken }]);

            await promisePool.query(sql);

            const emailResult = await sendEmail.verify(authToken, user, origin);

            console.log(emailResult);

            res.status(201).json({ msg: 'User successfully registered' });
        }


    } catch (err) {
        //console.log(err.message)

        res.status(409).json(err.message);

        // res.status(500).json({ msg: err.message });
    }

}

const verifyUser = async (req, res) => {

    const { authToken } = req.query;

    try {
        let sql = "SELECT email, id, name, surname from users WHERE ?";
        sql = mysql.format(sql, { authToken })

        const [rows] = await promisePool.query(sql);
        const [result] = rows;

        if (!result) {
            console.log('No user found')
            throw new Error('User account not found in the system.')

        } else {

            res.status(200).json({ user: result });
        }

    } catch (err) {

        res.status(409).json(err.message);

    }
}

const forgotPassword = async (req, res) => {

    const { email } = req.body;
    const origin = req.get('origin');

    let sql = "SELECT name, surname FROM users WHERE ?";
    sql = mysql.format(sql, { email });

    try {
        const [result] = await promisePool.query(sql)
       // console.log(result.length);
        if (result.length > 0) {

            const authToken = toolsObj.createAuthToken();
            const [row] = result;
            const { name, surname } = row;

            const user = { email, name, surname };

            sql = "UPDATE users SET ? WHERE ?";
            sql = mysql.format(sql, [{ authToken }, { email }]);
            await promisePool.query(sql);

            const emailResult = await sendEmail.verify(authToken, user, origin);

            console.log(emailResult);

            res.status(200).json({ email: email });

        } else {
            throw new Error('Email not found in the system.')
        }


    } catch (err) {
        res.status(409).json(err.message);
    }


}

const resetPassword = async (req, res) => {

    const { password, userId: id } = req.body;

    try {

        const hash = await bcrypt.hash(password, 12);

        let sql = "UPDATE users SET ? WHERE ?";
        sql = mysql.format(sql, [
            { password: hash, verified: 1, authToken: null, status: 1 },
            { id: id },
        ]);

        await promisePool.query(sql);

        res.status(200).json({ msg: "Passowrd reset succesful" });


    } catch (err) {
        res.status(409).json(err.message);
    }

}

module.exports = {
    updateUser,
    setUser,
    loginUser,
    logoutUser,
    verifyUser,
    forgotPassword,
    resetPassword
};
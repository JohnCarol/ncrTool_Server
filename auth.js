const jwt = require("jsonwebtoken");
const jwtSecret = require("./config/jwtConfig");
const { pool } = require("./config/db");
const mysql = require("mysql2");
const promisePool = pool.promise();

module.exports = async (request, response, next) => {
  

  try {

    let token;

    if (request.headers.authorization) {
      token = await request.headers.authorization.split(" ")[1];
    } else {
      token = ''
      //console.log(request.headers)
    }

    //token = await request.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, jwtSecret.secret);

    const user = decodedToken;

    const { userID: id } = user;

    request.user = user;

    let sql = "SELECT * FROM users WHERE ?";

    sql = mysql.format(sql, { id });

    [row] = await promisePool.query(sql);

    const [foundUser] = row;

    request.user.userId = foundUser.id;
    request.user.userType = foundUser.user_type;
    request.user.role = foundUser.role_name;
    request.user.userEmail = foundUser.email;
    request.user.location = foundUser.location;
    request.user.organisation = foundUser.organisation;
    request.user.name = foundUser.name;
    request.user.surname = foundUser.surname;
    request.user.department = foundUser.department;

    next();
  } catch (error) {

    response.status(401).json({
      error: new Error("Not authorized!"),
    });
    console.log(error);
  }
};

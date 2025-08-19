const Sequelize = require ("sequelize");
const UserModel = require ("./models/user");

const host = process.env.DB_HOST;
const user = process.env.DB_USER;
const password = process.env.DB_PWD;
const database = process.env.DB_NAME_SIZING;

const sequelize = new Sequelize(database, user, password, {
  host: host,
  dialect: "mysql",
});

const User = UserModel(sequelize, Sequelize);

sequelize.sync().then(() => {
  console.log("Users db and user table have been created");
});

module.exports = User;
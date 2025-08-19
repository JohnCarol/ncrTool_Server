module.exports = (sequelize, type) => {
    return sequelize.define("users", {
      id: {
        type: type.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: type.STRING,
      surname: type.STRING,
      department: type.STRING,
      contact_no: type.STRING,
      email: { type: type.STRING, allowNull: false },
      password: { type: type.STRING, allowNull: false },
      user_type: {type: type.INTEGER, allowNull:false}
    });
  };
  
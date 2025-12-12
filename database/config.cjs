// database/config.js
require("dotenv").config();
// import 'dotenv/config';

module.exports = {
  development: {
    username: process.env.MYSQL_USERNAME || "root",
    password: process.env.MYSQL_PASSWORD || "kuldeep1",
    database: process.env.MYSQL_DATABASE_NAME || "university_db",
    host: process.env.HOST || "localhost",
    dialect: "mysql",
    logging: false
  },

  production: {
    username: process.env.PROD_DB_USER,
    password: process.env.PROD_DB_PASS,
    database: process.env.PROD_DB_NAME,
    host: process.env.PROD_DB_HOST,
    dialect: "mysql"
  }
};
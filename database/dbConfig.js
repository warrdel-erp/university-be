export const dbConfig = {
<<<<<<< HEAD
  HOST: process.env.HOST || "localhost",
  USER: process.env.MYSQL_USERNAME || "root",
  PASSWORD: process.env.MYSQL_PASSWORD || "kuldeep1",
  DB: process.env.MYSQL_DATABASE_NAME || "university_db",
  dialect: "mysql",
=======
    HOST: process.env.HOST || 'localhost',
    USER: process.env.MYSQL_USERNAME || 'root',
    PASSWORD: process.env.MYSQL_PASSWORD|| 'kuldeep1',
    DB: process.env.MYSQL_DATABASE_NAME || 'university_db',
    dialect: 'mysql',
>>>>>>> c8988ae4c232c0c60daee0744aa3965316081481

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

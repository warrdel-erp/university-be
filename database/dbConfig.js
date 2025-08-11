import 'dotenv/config';

export const dbConfig = {
  HOST: process.env.HOST || 'localhost',
  USER: process.env.MYSQL_USERNAME || 'root',
  PASSWORD: process.env.MYSQL_PASSWORD,
  DB: process.env.MYSQL_DATABASE_NAME || 'university_db',
  dialect: 'mysql',

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

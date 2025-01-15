export const dbConfig = {
    HOST: process.env.HOST || 'localhost',
    USER: process.env.MYSQL_USERNAME || 'root',
    PASSWORD: process.env.MYSQL_PASSWORD|| '12345678',
    DB: process.env.MYSQL_DATABASE_NAME || 'university',
    dialect: 'mysql',

    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
}

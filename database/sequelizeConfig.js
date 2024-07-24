import {dbConfig} from '../database/dbConfig.js';
import { Sequelize} from 'sequelize';

const sequelize = new Sequelize(
    dbConfig.DB,
    dbConfig.USER,
    dbConfig.PASSWORD, {
        host: dbConfig.HOST,
        dialect: dbConfig.dialect,
        operatorsAliases: false,

        pool: {
            max: dbConfig.pool.max,
            min: dbConfig.pool.min,
            acquire: dbConfig.pool.acquire,
            idle: dbConfig.pool.idle

        }
    }
)

sequelize.authenticate()
.then(() => {
    console.log(`>>>>>Database connected: Name: ${dbConfig.DB} , host: ${dbConfig.HOST}>>>>>`)})
.catch(err => {
    console.log('Error while connecting to database'+ err)
})

sequelize.sync({ force: false })
.then(() => {
    console.log('>>>>>yes re-sync done!>>>>>')
})
  
export default sequelize;
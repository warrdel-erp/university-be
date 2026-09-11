import sequelize from './database/sequelizeConfig.js';
import { QueryTypes } from 'sequelize';

async function test() {
  try {
    const entry = JSON.stringify({ a: 1, b: "test" });
    const result = await sequelize.query(
      `SELECT JSON_ARRAY_APPEND('[]', '$', JSON_EXTRACT(:entry, '$')) AS result`,
      { replacements: { entry }, type: QueryTypes.SELECT }
    );
    console.log("SUCCESS:", result);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await sequelize.close();
  }
}
test();

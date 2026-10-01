import sequelize from "../database/sequelizeConfig.js";

async function run() {
  try {
    const [results] = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_NAME = 'session' AND REFERENCED_COLUMN_NAME = 'session_id';
    `);
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();

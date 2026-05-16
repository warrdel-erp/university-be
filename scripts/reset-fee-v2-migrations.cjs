'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');

const tables = [
  'student_fee_payment',
  'student_invoice_additional_fee',
  'student_fee_invoice',
  'additional_fee',
  'fee_plan_item',
  'fee_plan_profile',
  'fee_type_catalog',
  'fee_type_categories',
];

async function main() {
  const sequelize = new Sequelize(
    process.env.MYSQL_DATABASE_NAME || 'university_db',
    process.env.MYSQL_USERNAME || 'root',
    process.env.MYSQL_PASSWORD,
    {
      host: process.env.HOST || 'localhost',
      dialect: 'mysql',
      logging: false,
    }
  );

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    await sequelize.query(`DROP TABLE IF EXISTS \`${table}\``);
    console.log(`Dropped (if existed): ${table}`);
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

  const [, meta] = await sequelize.query(
    `DELETE FROM SequelizeMeta
     WHERE name LIKE '202605181%'
        OR name LIKE '202605191%'
        OR name LIKE '202605201%'
        OR name LIKE '202605211%'`
  );
  console.log('SequelizeMeta rows removed:', meta.affectedRows ?? meta);

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

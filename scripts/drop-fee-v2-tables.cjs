'use strict';

/**
 * Drops all 9 fee v2 tables, clears students.fee_plan_profile_id, clears SequelizeMeta for fee v2 creates.
 * Then run: npx sequelize-cli db:migrate
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const tables = [
  'payment_item',
  'student_fee_payment',
  'student_fee_invoice_items',
  'student_fee_invoice',
  'fee_plan_sub_items',
  'fee_plan_item',
  'fee_plan_profile',
  'fee_type_catalog',
  'fee_type_categories',
];

const legacyTables = ['additional_fee', 'student_invoice_additional_fee'];

const migrationNames = [
  '20260518100001-create-fee-type-categories.cjs',
  '20260518100002-create-fee-type-catalog.cjs',
  '20260518100003-create-fee-plan-profile.cjs',
  '20260518100004-create-fee-plan-item.cjs',
  '20260518100005-create-fee-plan-sub-items.cjs',
  '20260518100005-create-additional-fee.cjs',
  '20260518100006-create-student-fee-invoice.cjs',
  '20260518100007-create-student-fee-invoice-items.cjs',
  '20260518100007-create-student-invoice-additional-fee.cjs',
  '20260518100008-create-student-fee-payment.cjs',
  '20260518100009-create-payment-item.cjs',
  '20260522190000-create-payment-item.cjs',
  '20260522130000-alter-additional-fee-to-fee-plan-sub-items.cjs',
  '20260522150000-alter-fee-plan-item-remove-amount.cjs',
  '20260522160000-alter-student-fee-invoice-remove-amount.cjs',
  '20260522170000-alter-student-invoice-additional-fee-to-invoice-items.cjs',
  '20260522200000-alter-student-fee-payment-v2-columns.cjs',
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

  const [, studentUpdate] = await sequelize.query(
    'UPDATE students SET fee_plan_profile_id = NULL WHERE fee_plan_profile_id IS NOT NULL'
  );
  console.log(`students.fee_plan_profile_id set to NULL: ${studentUpdate.affectedRows ?? 0} row(s)`);

  for (const table of [...tables, ...legacyTables]) {
    await sequelize.query(`DROP TABLE IF EXISTS \`${table}\``);
    console.log(`Dropped (if existed): ${table}`);
  }

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

  for (const name of migrationNames) {
    const [, result] = await sequelize.query('DELETE FROM SequelizeMeta WHERE name = ?', {
      replacements: [name],
    });
    if (result.affectedRows > 0) {
      console.log(`SequelizeMeta removed: ${name}`);
    }
  }

  await sequelize.close();
  console.log('Done. Run: npx sequelize-cli db:migrate');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

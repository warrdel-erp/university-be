'use strict';

/**
 * DEV/STAGING ONLY — same as 20260521130000 + nullable fee_plan_item on invoice.
 * Not required on fresh production (see 20260518100006).
 */

const repair = require('./20260521130000-recreate-fee-v2-tables.cjs');

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tableName`,
    { replacements: { tableName } }
  );
  return Number(rows[0].cnt) > 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await repair.up(queryInterface, Sequelize);

    if (!(await tableExists(queryInterface, 'student_fee_invoice'))) return;

    const nullableMigration = require('./20260521150000-student-fee-invoice-fee-plan-item-nullable.cjs');
    await nullableMigration.up(queryInterface);
  },

  async down(queryInterface, Sequelize) {
    const nullableMigration = require('./20260521150000-student-fee-invoice-fee-plan-item-nullable.cjs');
    await nullableMigration.down(queryInterface, Sequelize);
  },
};

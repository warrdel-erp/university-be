'use strict';

/**
 * Allow NULL fee_plan_item_id on student_fee_invoice (adhoc / independent invoices).
 */

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tableName`,
    { replacements: { tableName } }
  );
  return Number(rows[0].cnt) > 0;
}

async function allowNullFeePlanItemId(queryInterface) {
  const [fks] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME AS name
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'student_fee_invoice'
       AND COLUMN_NAME = 'fee_plan_item_id'
       AND REFERENCED_TABLE_NAME IS NOT NULL`
  );

  for (const { name } of fks) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`student_fee_invoice\` DROP FOREIGN KEY \`${name}\``
    );
  }

  await queryInterface.sequelize.query(
    'ALTER TABLE `student_fee_invoice` MODIFY `fee_plan_item_id` INT NULL'
  );

  await queryInterface.addConstraint('student_fee_invoice', {
    fields: ['fee_plan_item_id'],
    type: 'foreign key',
    name: 'fk_student_fee_invoice_fee_plan_item',
    references: { table: 'fee_plan_item', field: 'fee_plan_item_id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'student_fee_invoice'))) return;
    await allowNullFeePlanItemId(queryInterface);
  },

  async down(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'student_fee_invoice'))) return;

    await queryInterface.removeConstraint(
      'student_fee_invoice',
      'fk_student_fee_invoice_fee_plan_item'
    );

    await queryInterface.changeColumn('student_fee_invoice', 'fee_plan_item_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'fee_plan_item', key: 'fee_plan_item_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },
};

'use strict';

/**
 * DEV/STAGING ONLY — alters existing additional_fee.fee_plan_item_id to NULL.
 * Fresh production: already nullable in 20260518100005-create-additional-fee.cjs.
 */

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tableName`,
    { replacements: { tableName } }
  );
  return Number(rows[0].cnt) > 0;
}

async function allowNullFeePlanItemId(queryInterface, tableName, constraintName) {
  const [fks] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME AS name
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :tableName
       AND COLUMN_NAME = 'fee_plan_item_id'
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: { tableName } }
  );

  for (const { name } of fks) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${name}\``
    );
  }

  await queryInterface.sequelize.query(
    `ALTER TABLE \`${tableName}\` MODIFY \`fee_plan_item_id\` INT NULL`
  );

  await queryInterface.addConstraint(tableName, {
    fields: ['fee_plan_item_id'],
    type: 'foreign key',
    name: constraintName,
    references: { table: 'fee_plan_item', field: 'fee_plan_item_id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'additional_fee'))) return;

    await allowNullFeePlanItemId(
      queryInterface,
      'additional_fee',
      'fk_additional_fee_fee_plan_item'
    );
  },

  async down(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'additional_fee'))) return;

    await queryInterface.removeConstraint(
      'additional_fee',
      'fk_additional_fee_fee_plan_item'
    );

    await queryInterface.changeColumn('additional_fee', 'fee_plan_item_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'fee_plan_item', key: 'fee_plan_item_id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },
};

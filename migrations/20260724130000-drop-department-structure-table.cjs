'use strict';

async function tableExists(queryInterface, tableName, transaction) {
  const [tables] = await queryInterface.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [tableName], transaction }
  );
  return tables.length > 0;
}

async function removeIncomingForeignKeys(queryInterface, referencedTable, transaction) {
  const [incomingConstraints] = await queryInterface.sequelize.query(
    `SELECT TABLE_NAME, CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
       AND REFERENCED_TABLE_NAME = ?`,
    { replacements: [referencedTable], transaction }
  );

  for (const { TABLE_NAME, CONSTRAINT_NAME } of incomingConstraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${TABLE_NAME}\` DROP FOREIGN KEY \`${CONSTRAINT_NAME}\``,
      { transaction }
    );
  }
}

async function dropTableIfExists(queryInterface, tableName, transaction) {
  if (!(await tableExists(queryInterface, tableName, transaction))) {
    return;
  }

  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    { replacements: [tableName], transaction }
  );

  for (const { CONSTRAINT_NAME } of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${CONSTRAINT_NAME}\``,
      { transaction }
    );
  }

  await removeIncomingForeignKeys(queryInterface, tableName, transaction);
  await queryInterface.dropTable(tableName, { transaction });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await dropTableIfExists(queryInterface, 'department_structure', transaction);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down() {},
};

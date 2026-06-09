'use strict';

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const [columns] = await queryInterface.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName], transaction }
  );
  return columns.length > 0;
}

async function dropForeignKeysOnColumn(queryInterface, tableName, columnName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [tableName, columnName], transaction }
  );

  for (const { CONSTRAINT_NAME } of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${CONSTRAINT_NAME}\``,
      { transaction }
    );
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      if (!(await columnExists(queryInterface, 'asset', 'department_id', transaction))) {
        await transaction.commit();
        return;
      }

      await dropForeignKeysOnColumn(queryInterface, 'asset', 'department_id', transaction);
      await queryInterface.removeColumn('asset', 'department_id', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      if (await columnExists(queryInterface, 'asset', 'department_id', transaction)) {
        await transaction.commit();
        return;
      }

      await queryInterface.addColumn(
        'asset',
        'department_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'department', key: 'department_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

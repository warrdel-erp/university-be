'use strict';

async function dropForeignKey(queryInterface, tableName, columnName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
      AND COLUMN_NAME = :columnName
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: { tableName, columnName }, transaction },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('students');

      if (table.class_sections_id) {
        await dropForeignKey(queryInterface, 'students', 'class_sections_id', transaction);
        await queryInterface.removeColumn('students', 'class_sections_id', { transaction });
      }

      if (table.fee_plan_id) {
        await dropForeignKey(queryInterface, 'students', 'fee_plan_id', transaction);
        await queryInterface.removeColumn('students', 'fee_plan_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('students');

      if (!table.class_sections_id) {
        await queryInterface.addColumn(
          'students',
          'class_sections_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'class_sections', key: 'class_sections_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      if (!table.fee_plan_id) {
        await queryInterface.addColumn(
          'students',
          'fee_plan_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'fee_plan', key: 'fee_plan_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

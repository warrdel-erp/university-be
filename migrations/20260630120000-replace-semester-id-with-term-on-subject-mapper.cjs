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

/** subject_mapper: program term replaces legacy semester_id column */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable('subject_mapper');

      if (!table.term) {
        await queryInterface.addColumn(
          'subject_mapper',
          'term',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'Program term number',
          },
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        `
        UPDATE subject_mapper sm
        INNER JOIN subject s ON s.subject_id = sm.subject_id
        SET sm.term = s.term
        WHERE sm.term IS NULL AND s.term IS NOT NULL
        `,
        { transaction },
      );

      if (table.semester_id) {
        await dropForeignKey(queryInterface, 'subject_mapper', 'semester_id', transaction);
        await queryInterface.removeColumn('subject_mapper', 'semester_id', { transaction });
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
      const table = await queryInterface.describeTable('subject_mapper');

      if (!table.semester_id) {
        await queryInterface.addColumn(
          'subject_mapper',
          'semester_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction },
        );
      }

      if (table.term) {
        await queryInterface.removeColumn('subject_mapper', 'term', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

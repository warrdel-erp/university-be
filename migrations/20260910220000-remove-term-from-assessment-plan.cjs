'use strict';

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const table = await queryInterface.describeTable(tableName, { transaction });
  return Boolean(table[columnName]);
}

async function dropForeignKeysOnColumn(queryInterface, tableName, columnName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: [tableName, columnName], transaction },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }
}

async function dropIndexesOnColumn(queryInterface, tableName, columnName, transaction) {
  const [indexes] = await queryInterface.sequelize.query(
    `
    SELECT DISTINCT INDEX_NAME AS indexName
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
      AND INDEX_NAME <> 'PRIMARY'
    `,
    { replacements: [tableName, columnName], transaction },
  );

  for (const row of indexes) {
    try {
      await queryInterface.removeIndex(tableName, row.indexName, { transaction });
    } catch (error) {
      // Index may already be gone or named differently across environments.
    }
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const hasTerm = await columnExists(
        queryInterface,
        'assessment_plan',
        'term',
        transaction,
      );

      if (hasTerm) {
        await dropForeignKeysOnColumn(
          queryInterface,
          'assessment_plan',
          'term',
          transaction,
        );
        await dropIndexesOnColumn(
          queryInterface,
          'assessment_plan',
          'term',
          transaction,
        );
        await queryInterface.removeColumn('assessment_plan', 'term', {
          transaction,
        });
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
      const hasTerm = await columnExists(
        queryInterface,
        'assessment_plan',
        'term',
        transaction,
      );

      if (!hasTerm) {
        await queryInterface.addColumn(
          'assessment_plan',
          'term',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
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

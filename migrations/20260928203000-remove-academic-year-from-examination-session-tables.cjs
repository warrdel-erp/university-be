'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tables = [
        'examination_session',
        'examination_session_slot',
        'examination_session_term',
      ];

      for (const table of tables) {
        // 1. Drop foreign key constraints referencing acedmic_year_id
        const [fks] = await queryInterface.sequelize.query(
          `SELECT CONSTRAINT_NAME, COLUMN_NAME
           FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
           WHERE TABLE_NAME = '${table}'
             AND TABLE_SCHEMA = DATABASE()
             AND COLUMN_NAME = 'acedmic_year_id'
             AND REFERENCED_TABLE_NAME IS NOT NULL;`,
          { transaction }
        );

        for (const fk of fks) {
          try {
            await queryInterface.removeConstraint(table, fk.CONSTRAINT_NAME, { transaction });
            console.log(`Dropped FK constraint ${fk.CONSTRAINT_NAME} from ${table}`);
          } catch (err) {
            console.log(`Could not drop FK ${fk.CONSTRAINT_NAME} from ${table}:`, err.message);
          }
        }

        // 2. Drop indexes on acedmic_year_id
        const [indexes] = await queryInterface.sequelize.query(
          `SHOW INDEXES FROM ${table} WHERE Key_name NOT IN ('PRIMARY');`,
          { transaction }
        );

        const indexNamesToDrop = new Set();
        for (const idx of indexes) {
          if (idx.Column_name === 'acedmic_year_id') {
            indexNamesToDrop.add(idx.Key_name);
          }
        }

        for (const indexName of indexNamesToDrop) {
          try {
            await queryInterface.removeIndex(table, indexName, { transaction });
            console.log(`Dropped index ${indexName} from ${table}`);
          } catch (err) {
            console.log(`Could not drop index ${indexName} from ${table}:`, err.message);
          }
        }

        // 3. Drop column acedmic_year_id
        const tableDesc = await queryInterface.describeTable(table, { transaction }).catch(() => ({}));
        if (tableDesc.acedmic_year_id) {
          await queryInterface.removeColumn(table, 'acedmic_year_id', { transaction });
          console.log(`Dropped column acedmic_year_id from ${table}`);
        }
      }

      await transaction.commit();
      console.log('Migration to remove academic_year_id from examination session tables completed successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableDescSession = await queryInterface.describeTable('examination_session', { transaction }).catch(() => ({}));
      if (!tableDescSession.acedmic_year_id) {
        await queryInterface.addColumn('examination_session', 'acedmic_year_id', {
          type: Sequelize.BIGINT,
          allowNull: true,
        }, { transaction });
      }

      const tableDescSlot = await queryInterface.describeTable('examination_session_slot', { transaction }).catch(() => ({}));
      if (!tableDescSlot.acedmic_year_id) {
        await queryInterface.addColumn('examination_session_slot', 'acedmic_year_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        }, { transaction });
      }

      const tableDescTerm = await queryInterface.describeTable('examination_session_term', { transaction }).catch(() => ({}));
      if (!tableDescTerm.acedmic_year_id) {
        await queryInterface.addColumn('examination_session_term', 'acedmic_year_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

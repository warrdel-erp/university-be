'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableDesc = await queryInterface.describeTable('exam_schedule', { transaction }).catch(() => ({}));

      // 1. Add batch_id if it doesn't exist
      if (!tableDesc.batch_id) {
        await queryInterface.addColumn(
          'exam_schedule',
          'batch_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'batch',
              key: 'batch_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction }
        );
        console.log('Added batch_id to exam_schedule');
      }

      // 2. Add curriculum_subject_term_mapping_id if it doesn't exist
      if (!tableDesc.curriculum_subject_term_mapping_id) {
        await queryInterface.addColumn(
          'exam_schedule',
          'curriculum_subject_term_mapping_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'curriculum_subject_term_mapping',
              key: 'curriculum_subject_term_mapping_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction }
        );
        console.log('Added curriculum_subject_term_mapping_id to exam_schedule');
      }

      // 3. Drop foreign keys referencing acedmic_year_id on exam_schedule
      const [fks] = await queryInterface.sequelize.query(
        `SELECT CONSTRAINT_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_NAME = 'exam_schedule'
           AND TABLE_SCHEMA = DATABASE()
           AND COLUMN_NAME = 'acedmic_year_id'
           AND REFERENCED_TABLE_NAME IS NOT NULL;`,
        { transaction }
      );

      for (const fk of fks) {
        try {
          await queryInterface.removeConstraint('exam_schedule', fk.CONSTRAINT_NAME, { transaction });
          console.log(`Dropped FK constraint ${fk.CONSTRAINT_NAME} from exam_schedule`);
        } catch (err) {
          console.log(`Could not drop FK ${fk.CONSTRAINT_NAME}:`, err.message);
        }
      }

      // 4. Drop indexes on acedmic_year_id
      const [indexes] = await queryInterface.sequelize.query(
        `SHOW INDEXES FROM exam_schedule WHERE Key_name NOT IN ('PRIMARY');`,
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
          await queryInterface.removeIndex('exam_schedule', indexName, { transaction });
          console.log(`Dropped index ${indexName} from exam_schedule`);
        } catch (err) {
          console.log(`Could not drop index ${indexName}:`, err.message);
        }
      }

      // 5. Drop column acedmic_year_id
      if (tableDesc.acedmic_year_id) {
        await queryInterface.removeColumn('exam_schedule', 'acedmic_year_id', { transaction });
        console.log('Dropped column acedmic_year_id from exam_schedule');
      }

      await transaction.commit();
      console.log('Migration for exam_schedule completed successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableDesc = await queryInterface.describeTable('exam_schedule', { transaction }).catch(() => ({}));

      if (!tableDesc.acedmic_year_id) {
        await queryInterface.addColumn(
          'exam_schedule',
          'acedmic_year_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction }
        );
      }

      if (tableDesc.batch_id) {
        await queryInterface.removeColumn('exam_schedule', 'batch_id', { transaction });
      }

      if (tableDesc.curriculum_subject_term_mapping_id) {
        await queryInterface.removeColumn('exam_schedule', 'curriculum_subject_term_mapping_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

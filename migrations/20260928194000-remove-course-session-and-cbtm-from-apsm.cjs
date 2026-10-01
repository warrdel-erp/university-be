'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Drop foreign key constraints referencing columns to be dropped
      const [fks] = await queryInterface.sequelize.query(
        `SELECT CONSTRAINT_NAME, COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_NAME = 'assessment_plan_subject_mapping'
           AND TABLE_SCHEMA = DATABASE()
           AND COLUMN_NAME IN ('course_id', 'session_id', 'curriculum_batch_term_mapping_id')
           AND REFERENCED_TABLE_NAME IS NOT NULL;`,
        { transaction }
      );

      for (const fk of fks) {
        try {
          await queryInterface.removeConstraint('assessment_plan_subject_mapping', fk.CONSTRAINT_NAME, { transaction });
          console.log(`Dropped FK constraint: ${fk.CONSTRAINT_NAME}`);
        } catch (err) {
          console.log(`Could not drop FK ${fk.CONSTRAINT_NAME}:`, err.message);
        }
      }

      // 2. Drop old indexes that include the columns to be dropped
      const [indexes] = await queryInterface.sequelize.query(
        `SHOW INDEXES FROM assessment_plan_subject_mapping WHERE Key_name NOT IN ('PRIMARY');`,
        { transaction }
      );

      const indexNamesToDrop = new Set();
      for (const idx of indexes) {
        if (['course_id', 'session_id', 'curriculum_batch_term_mapping_id'].includes(idx.Column_name)) {
          indexNamesToDrop.add(idx.Key_name);
        }
      }

      for (const indexName of indexNamesToDrop) {
        try {
          await queryInterface.removeIndex('assessment_plan_subject_mapping', indexName, { transaction });
          console.log(`Dropped index: ${indexName}`);
        } catch (err) {
          console.log(`Could not drop index ${indexName}:`, err.message);
        }
      }

      // 3. Drop columns
      const tableDesc = await queryInterface.describeTable('assessment_plan_subject_mapping', { transaction }).catch(() => ({}));

      if (tableDesc.curriculum_batch_term_mapping_id) {
        await queryInterface.removeColumn('assessment_plan_subject_mapping', 'curriculum_batch_term_mapping_id', { transaction });
        console.log('Dropped column curriculum_batch_term_mapping_id');
      }

      if (tableDesc.course_id) {
        await queryInterface.removeColumn('assessment_plan_subject_mapping', 'course_id', { transaction });
        console.log('Dropped column course_id');
      }

      if (tableDesc.session_id) {
        await queryInterface.removeColumn('assessment_plan_subject_mapping', 'session_id', { transaction });
        console.log('Dropped column session_id');
      }

      // 4. Add new unique index for batch + curriculumSubjectTermMapping + assessmentPlan
      try {
        await queryInterface.addIndex(
          'assessment_plan_subject_mapping',
          ['batch_id', 'curriculum_subject_term_mapping_id', 'assessment_plan_id'],
          {
            unique: true,
            name: 'unique_batch_cstm_plan',
            transaction,
          }
        );
        console.log('Added unique index unique_batch_cstm_plan');
      } catch (err) {
        console.log('Unique index note:', err.message);
      }

      await transaction.commit();
      console.log('Migration completed successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableDesc = await queryInterface.describeTable('assessment_plan_subject_mapping', { transaction }).catch(() => ({}));

      if (!tableDesc.course_id) {
        await queryInterface.addColumn('assessment_plan_subject_mapping', 'course_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        }, { transaction });
      }

      if (!tableDesc.session_id) {
        await queryInterface.addColumn('assessment_plan_subject_mapping', 'session_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        }, { transaction });
      }

      if (!tableDesc.curriculum_batch_term_mapping_id) {
        await queryInterface.addColumn('assessment_plan_subject_mapping', 'curriculum_batch_term_mapping_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

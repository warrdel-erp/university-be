'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableDesc = await queryInterface.describeTable('exam_schedule', { transaction }).catch(() => ({}));

      // 0. Seed / Backfill batch_id and curriculum_subject_term_mapping_id if missing
      try {
        if (tableDesc.curriculum_batch_term_mapping_id) {
          await queryInterface.sequelize.query(
            `UPDATE exam_schedule es
             JOIN curriculum_batch_term_mapping cbtm ON es.curriculum_batch_term_mapping_id = cbtm.curriculum_batch_term_mapping_id
             SET es.batch_id = cbtm.batch_id
             WHERE es.batch_id IS NULL AND es.curriculum_batch_term_mapping_id IS NOT NULL;`,
            { transaction }
          );
        }

        if (tableDesc.session_id) {
          await queryInterface.sequelize.query(
            `UPDATE exam_schedule es
             JOIN batch b ON es.session_id = b.session_id
             SET es.batch_id = b.batch_id
             WHERE es.batch_id IS NULL AND es.session_id IS NOT NULL;`,
            { transaction }
          );
        }

        // Backfill batch_id via examination_session_term (examinationSessionModel & examinationSessionTermModel)
        await queryInterface.sequelize.query(
          `UPDATE exam_schedule es
           JOIN examination_session_term est ON es.examination_session_id = est.examination_session_id
           JOIN batch b ON est.session_id = b.session_id
           SET es.batch_id = b.batch_id
           WHERE es.batch_id IS NULL AND es.examination_session_id IS NOT NULL;`,
          { transaction }
        );

        // Backfill curriculum_subject_term_mapping_id matching subject_id and term
        await queryInterface.sequelize.query(
          `UPDATE exam_schedule es
           JOIN curriculum_subject_term_mapping cstm 
             ON es.subject_id = cstm.subject_id 
            AND es.term = cstm.term
           SET es.curriculum_subject_term_mapping_id = cstm.curriculum_subject_term_mapping_id
           WHERE es.curriculum_subject_term_mapping_id IS NULL;`,
          { transaction }
        );

        // Fallback: match by subject_id if term was null
        await queryInterface.sequelize.query(
          `UPDATE exam_schedule es
           JOIN curriculum_subject_term_mapping cstm 
             ON es.subject_id = cstm.subject_id
           SET es.curriculum_subject_term_mapping_id = cstm.curriculum_subject_term_mapping_id,
               es.term = COALESCE(es.term, cstm.term)
           WHERE es.curriculum_subject_term_mapping_id IS NULL;`,
          { transaction }
        );
        console.log('Seeded batch_id and curriculum_subject_term_mapping_id successfully.');
      } catch (seedErr) {
        console.log('Notice during batch_id / curriculum_subject_term_mapping_id seeding:', seedErr.message);
      }

      // 1. Drop foreign keys referencing session_id and curriculum_batch_term_mapping_id on exam_schedule
      const [fks] = await queryInterface.sequelize.query(
        `SELECT CONSTRAINT_NAME, COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_NAME = 'exam_schedule'
           AND TABLE_SCHEMA = DATABASE()
           AND COLUMN_NAME IN ('session_id', 'curriculum_batch_term_mapping_id')
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

      // 2. Drop indexes on session_id and curriculum_batch_term_mapping_id
      const [indexes] = await queryInterface.sequelize.query(
        `SHOW INDEXES FROM exam_schedule WHERE Key_name NOT IN ('PRIMARY');`,
        { transaction }
      );

      const indexNamesToDrop = new Set();
      for (const idx of indexes) {
        if (['session_id', 'curriculum_batch_term_mapping_id'].includes(idx.Column_name)) {
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

      // 3. Drop column session_id
      if (tableDesc.session_id) {
        await queryInterface.removeColumn('exam_schedule', 'session_id', { transaction });
        console.log('Dropped column session_id from exam_schedule');
      }

      // 4. Drop column curriculum_batch_term_mapping_id
      if (tableDesc.curriculum_batch_term_mapping_id) {
        await queryInterface.removeColumn('exam_schedule', 'curriculum_batch_term_mapping_id', { transaction });
        console.log('Dropped column curriculum_batch_term_mapping_id from exam_schedule');
      }

      await transaction.commit();
      console.log('Migration for removing session_id and curriculum_batch_term_mapping_id completed successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableDesc = await queryInterface.describeTable('exam_schedule', { transaction }).catch(() => ({}));

      if (!tableDesc.session_id) {
        await queryInterface.addColumn(
          'exam_schedule',
          'session_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction }
        );
      }

      if (!tableDesc.curriculum_batch_term_mapping_id) {
        await queryInterface.addColumn(
          'exam_schedule',
          'curriculum_batch_term_mapping_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

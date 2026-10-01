'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableDesc = await queryInterface.describeTable('assessment_plan_subject_mapping', { transaction }).catch(() => ({}));

      // 1. Add batch_id column if not exists
      if (!tableDesc.batch_id) {
        await queryInterface.addColumn(
          'assessment_plan_subject_mapping',
          'batch_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction }
        );

        try {
          await queryInterface.addConstraint('assessment_plan_subject_mapping', {
            fields: ['batch_id'],
            type: 'foreign key',
            name: 'fk_apsm_batch_id',
            references: {
              table: 'batch',
              field: 'batch_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            transaction,
          });
        } catch (fkErr) {
          console.log('FK fk_apsm_batch_id note:', fkErr.message);
        }
      }

      // 2. Add curriculum_subject_term_mapping_id column if not exists
      if (!tableDesc.curriculum_subject_term_mapping_id) {
        await queryInterface.addColumn(
          'assessment_plan_subject_mapping',
          'curriculum_subject_term_mapping_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction }
        );

        try {
          await queryInterface.addConstraint('assessment_plan_subject_mapping', {
            fields: ['curriculum_subject_term_mapping_id'],
            type: 'foreign key',
            name: 'fk_apsm_curriculum_subject_term_mapping_id',
            references: {
              table: 'curriculum_subject_term_mapping',
              field: 'curriculum_subject_term_mapping_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            transaction,
          });
        } catch (fkErr) {
          console.log('FK fk_apsm_curriculum_subject_term_mapping_id note:', fkErr.message);
        }
      }

      // 3. Make course_id and session_id nullable
      if (tableDesc.course_id && !tableDesc.course_id.allowNull) {
        await queryInterface.changeColumn(
          'assessment_plan_subject_mapping',
          'course_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction }
        );
      }

      if (tableDesc.session_id && !tableDesc.session_id.allowNull) {
        await queryInterface.changeColumn(
          'assessment_plan_subject_mapping',
          'session_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction }
        );
      }

      // 4. Backfill batch_id from session + batch for existing records
      await queryInterface.sequelize.query(
        `UPDATE assessment_plan_subject_mapping apsm
         INNER JOIN session s ON s.session_id = apsm.session_id AND s.course_id = apsm.course_id
         INNER JOIN batch b ON b.session_id = s.session_id
         SET apsm.batch_id = b.batch_id
         WHERE apsm.batch_id IS NULL AND apsm.course_id IS NOT NULL AND apsm.session_id IS NOT NULL;`,
        { transaction }
      );

      // 5. Backfill curriculum_subject_term_mapping_id if possible
      await queryInterface.sequelize.query(
        `UPDATE assessment_plan_subject_mapping apsm
         INNER JOIN curriculum_batch_mapping cbm ON cbm.batch_id = apsm.batch_id
         INNER JOIN curriculum_subject_term_mapping cstm ON cstm.curriculum_id = cbm.curriculum_id AND cstm.subject_id = apsm.subject_id
         SET apsm.curriculum_subject_term_mapping_id = cstm.curriculum_subject_term_mapping_id
         WHERE apsm.curriculum_subject_term_mapping_id IS NULL AND apsm.batch_id IS NOT NULL;`,
        { transaction }
      );

      await transaction.commit();
      console.log('Migration up completed successfully.');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableDesc = await queryInterface.describeTable('assessment_plan_subject_mapping', { transaction }).catch(() => ({}));

      if (tableDesc.curriculum_subject_term_mapping_id) {
        try {
          await queryInterface.removeConstraint('assessment_plan_subject_mapping', 'fk_apsm_curriculum_subject_term_mapping_id', { transaction });
        } catch (_) {}
        await queryInterface.removeColumn('assessment_plan_subject_mapping', 'curriculum_subject_term_mapping_id', { transaction });
      }

      if (tableDesc.batch_id) {
        try {
          await queryInterface.removeConstraint('assessment_plan_subject_mapping', 'fk_apsm_batch_id', { transaction });
        } catch (_) {}
        await queryInterface.removeColumn('assessment_plan_subject_mapping', 'batch_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

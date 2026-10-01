'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Add batch_id to assessment_plan if not present
      const tableDesc = await queryInterface.describeTable('assessment_plan', { transaction }).catch(() => ({}));
      if (!tableDesc.batch_id && !tableDesc.batchId) {
        await queryInterface.addColumn(
          'assessment_plan',
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
        console.log('Added batch_id column to assessment_plan');
      }

      // 2. Seed batch_id from assessment_plan_subject_mapping where already mapped
      await queryInterface.sequelize.query(
        `UPDATE assessment_plan ap
         JOIN (
           SELECT assessment_plan_id, MIN(batch_id) AS matched_batch_id
           FROM assessment_plan_subject_mapping
           WHERE batch_id IS NOT NULL
           GROUP BY assessment_plan_id
         ) m ON ap.assessment_plan_id = m.assessment_plan_id
         SET ap.batch_id = m.matched_batch_id
         WHERE ap.batch_id IS NULL;`,
        { transaction }
      );
      console.log('Seeded batch_id from assessment_plan_subject_mapping');

      // 3. Seed remaining batch_id by matching plan name/code year and course_id to batch
      await queryInterface.sequelize.query(
        `UPDATE assessment_plan ap
         JOIN (
           SELECT b.batch_id, s.course_id, b.batch
           FROM batch b
           JOIN session s ON b.session_id = s.session_id
         ) b ON b.course_id = ap.course_id AND (ap.plan_name LIKE CONCAT('%', b.batch, '%') OR ap.plan_code LIKE CONCAT('%', b.batch, '%'))
         SET ap.batch_id = b.batch_id
         WHERE ap.batch_id IS NULL;`,
        { transaction }
      );

      // 4. Fallback: match any active batch for that course_id
      await queryInterface.sequelize.query(
        `UPDATE assessment_plan ap
         JOIN (
           SELECT MIN(b.batch_id) AS fallback_batch_id, s.course_id
           FROM batch b
           JOIN session s ON b.session_id = s.session_id
           GROUP BY s.course_id
         ) fb ON fb.course_id = ap.course_id
         SET ap.batch_id = fb.fallback_batch_id
         WHERE ap.batch_id IS NULL;`,
        { transaction }
      );
      console.log('Completed seeding batch_id in assessment_plan');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableDesc = await queryInterface.describeTable('assessment_plan', { transaction }).catch(() => ({}));
      if (tableDesc.batch_id || tableDesc.batchId) {
        // Drop FK if exists
        const [fks] = await queryInterface.sequelize.query(
          `SELECT CONSTRAINT_NAME
           FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
           WHERE TABLE_NAME = 'assessment_plan'
             AND TABLE_SCHEMA = DATABASE()
             AND COLUMN_NAME = 'batch_id'
             AND REFERENCED_TABLE_NAME IS NOT NULL;`,
          { transaction }
        );

        for (const fk of fks) {
          try {
            await queryInterface.removeConstraint('assessment_plan', fk.CONSTRAINT_NAME, { transaction });
          } catch (err) {
            console.log(`Could not drop FK ${fk.CONSTRAINT_NAME}:`, err.message);
          }
        }

        await queryInterface.removeColumn('assessment_plan', 'batch_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

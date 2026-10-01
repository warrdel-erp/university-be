'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Drop foreign keys referencing course_id on assessment_plan
      const [fks] = await queryInterface.sequelize.query(
        `SELECT CONSTRAINT_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_NAME = 'assessment_plan'
           AND TABLE_SCHEMA = DATABASE()
           AND COLUMN_NAME = 'course_id'
           AND REFERENCED_TABLE_NAME IS NOT NULL;`,
        { transaction }
      );

      for (const fk of fks) {
        try {
          await queryInterface.removeConstraint('assessment_plan', fk.CONSTRAINT_NAME, { transaction });
          console.log(`Dropped FK constraint on assessment_plan.course_id: ${fk.CONSTRAINT_NAME}`);
        } catch (err) {
          console.log(`Could not drop FK ${fk.CONSTRAINT_NAME}:`, err.message);
        }
      }

      // 2. Drop indexes on course_id
      const [indexes] = await queryInterface.sequelize.query(
        `SHOW INDEXES FROM assessment_plan WHERE Key_name NOT IN ('PRIMARY');`,
        { transaction }
      );

      const indexesToDrop = new Set();
      for (const idx of indexes) {
        if (idx.Column_name === 'course_id') {
          indexesToDrop.add(idx.Key_name);
        }
      }

      for (const indexName of indexesToDrop) {
        try {
          await queryInterface.removeIndex('assessment_plan', indexName, { transaction });
          console.log(`Dropped index on assessment_plan: ${indexName}`);
        } catch (err) {
          console.log(`Could not drop index ${indexName}:`, err.message);
        }
      }

      // 3. Drop column course_id from assessment_plan
      const tableDesc = await queryInterface.describeTable('assessment_plan', { transaction }).catch(() => ({}));
      if (tableDesc.course_id || tableDesc.courseId) {
        await queryInterface.removeColumn('assessment_plan', 'course_id', { transaction });
        console.log('Dropped column course_id from assessment_plan');
      }

      await transaction.commit();
      console.log('Completed dropping course_id from assessment_plan');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableDesc = await queryInterface.describeTable('assessment_plan', { transaction }).catch(() => ({}));
      if (!tableDesc.course_id && !tableDesc.courseId) {
        await queryInterface.addColumn(
          'assessment_plan',
          'course_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'course',
              key: 'course_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction }
        );

        // Backfill course_id from batch -> session -> course
        await queryInterface.sequelize.query(
          `UPDATE assessment_plan ap
           JOIN batch b ON ap.batch_id = b.batch_id
           JOIN session s ON b.session_id = s.session_id
           SET ap.course_id = s.course_id
           WHERE ap.course_id IS NULL;`,
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

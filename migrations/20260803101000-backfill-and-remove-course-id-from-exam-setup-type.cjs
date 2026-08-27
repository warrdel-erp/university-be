'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if course_id column exists on exam_setup_type
    const tableInfo = await queryInterface.describeTable('exam_setup_type');

    if (tableInfo.course_id) {
      // 1. Backfill records into exam_setup_type_term for any existing exam_setup_type that has a course_id set
      await queryInterface.sequelize.query(`
        INSERT INTO exam_setup_type_term (
          exam_setup_type_id,
          university_id,
          institute_id,
          acedmic_year_id,
          course_id,
          term,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        SELECT 
          e.exam_setup_type_id,
          e.university_id,
          e.institute_id,
          COALESCE(
            (SELECT acedmic_year_id FROM acedmic_year WHERE institute_id = e.institute_id AND is_active = 1 LIMIT 1),
            (SELECT acedmic_year_id FROM acedmic_year WHERE institute_id = e.institute_id LIMIT 1),
            1
          ) AS acedmic_year_id,
          e.course_id,
          1 AS term,
          e.created_by,
          e.updated_by,
          NOW(),
          NOW()
        FROM exam_setup_type e
        WHERE e.course_id IS NOT NULL
        ON DUPLICATE KEY UPDATE updated_at = NOW();
      `);

      // 2. Drop course_id and session_id columns from exam_setup_type
      await queryInterface.removeColumn('exam_setup_type', 'course_id');
      if (tableInfo.session_id) {
        await queryInterface.removeColumn('exam_setup_type', 'session_id');
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('exam_setup_type');

    if (!tableInfo.course_id) {
      await queryInterface.addColumn('exam_setup_type', 'course_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'course',
          key: 'course_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    if (!tableInfo.session_id) {
      await queryInterface.addColumn('exam_setup_type', 'session_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'session',
          key: 'session_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },
};

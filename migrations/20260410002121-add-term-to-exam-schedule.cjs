'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add exam_setup_type_term_id (nullable initially)
    await queryInterface.addColumn('exam_schedule', 'exam_setup_type_term_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'exam_setup_type_term',
        key: 'exam_setup_type_term_id'
      }
    });

    // 2. Data Migration: Create term 1 records for existing schedules and link them
    // We use raw SQL to handle the cross-table logic
    await queryInterface.sequelize.query(`
      INSERT INTO exam_setup_type_term (exam_setup_type_id, acedmic_year_id, institute_id, university_id, term, course_id, created_by, updated_by, created_at, updated_at)
      SELECT DISTINCT 
          est.exam_setup_type_id, 
          estr.acedmic_year_id, 
          estr.institute_id, 
          estr.university_id, 
          1 as term, 
          estr.course_id, 
          es.created_by, 
          es.updated_by,
          NOW(),
          NOW()
      FROM exam_schedule es
      JOIN exam_setup_type est ON es.exam_setup_type_id = est.exam_setup_type_id
      JOIN exam_structure estr ON est.exam_structure_id = estr.exam_structure_id
      WHERE NOT EXISTS (
          SELECT 1 FROM exam_setup_type_term estt 
          WHERE estt.exam_setup_type_id = est.exam_setup_type_id 
          AND estt.course_id = estr.course_id 
          AND estt.term = 1
      );
    `);

    await queryInterface.sequelize.query(`
      UPDATE exam_schedule es
      SET exam_setup_type_term_id = (
          SELECT estt.exam_setup_type_term_id 
          FROM exam_setup_type_term estt
          JOIN exam_setup_type est ON estt.exam_setup_type_id = est.exam_setup_type_id
          JOIN exam_structure estr ON est.exam_structure_id = estr.exam_structure_id
          WHERE es.exam_setup_type_id = est.exam_setup_type_id
          AND estt.term = 1
          AND estt.course_id = estr.course_id
          LIMIT 1
      );
    `);

    // 3. Remove old columns
    await queryInterface.removeColumn('exam_schedule', 'exam_setup_type_id');
    
    try {
        await queryInterface.removeColumn('exam_schedule', 'term');
    } catch (e) {
        // term might not exist
    }

    // 4. Make exam_setup_type_term_id NOT NULL if you want to enforce it now
    // await queryInterface.changeColumn('exam_schedule', 'exam_setup_type_term_id', {
    //   type: Sequelize.INTEGER,
    //   allowNull: false
    // });
  },
  down: async (queryInterface, Sequelize) => {
    // Inverse is tricky but we'll try to restore the exam_setup_type_id
    await queryInterface.addColumn('exam_schedule', 'exam_setup_type_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'exam_setup_type',
        key: 'exam_setup_type_id'
      }
    });

    await queryInterface.sequelize.query(`
      UPDATE exam_schedule es
      SET exam_setup_type_id = (
        SELECT estt.exam_setup_type_id 
        FROM exam_setup_type_term estt 
        WHERE estt.exam_setup_type_term_id = es.exam_setup_type_term_id
      );
    `);

    await queryInterface.removeColumn('exam_schedule', 'exam_setup_type_term_id');
  }
};

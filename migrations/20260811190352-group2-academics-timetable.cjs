'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addColumnIfNotExists = async (table, column, referenceModel, referenceKey) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc[column]) {
        await queryInterface.addColumn(table, column, {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: referenceModel,
            key: referenceKey
          }
        });
      }
    };

    // Add missing columns
    await addColumnIfNotExists('attendance', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('assessment_evalution', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('assessment_evalution', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('assessment_evalution', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('class_schedule_item', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('class_schedule_item', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('class_schedule_item', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('evalutions', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('faculity_load', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('faculity_load', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('faculity_load', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('holiday', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('internal_assessment', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('internal_assessment', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('internal_assessment', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('syllabus_details', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('syllabus_details', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('syllabus_details', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('syllabus', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('teacher_attendence', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('teacher_attendence', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('teacher_attendence', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('time_table_structure_periods', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('time_table_structure_periods', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('time_table_structure_periods', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('class_student_mapper', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('class_subject_mapper', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('class_subject_mapper', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('session_course_mapping', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    await addColumnIfNotExists('teacher_exam_assignment', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('teacher_exam_assignment', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('teacher_section_mapping', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('teacher_section_mapping', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('teacher_section_mapping', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');

    // BACKFILL QUERIES

    await queryInterface.sequelize.query(`
      UPDATE attendance a
      JOIN class_sections c ON a.class_sections_id = c.class_sections_id
      SET a.acedmic_year_id = c.acedmic_year_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE assessment_evalution a
      JOIN subject s ON a.subject_id = s.subject_id
      SET a.university_id = s.university_id, a.institute_id = s.institute_id, a.acedmic_year_id = s.acedmic_year_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE class_schedule_item c
      JOIN subject s ON c.subject_id = s.subject_id
      SET c.university_id = s.university_id, c.institute_id = s.institute_id, c.acedmic_year_id = s.acedmic_year_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE evalutions e
      JOIN subject s ON e.subject_id = s.subject_id
      SET e.acedmic_year_id = s.acedmic_year_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE faculity_load f
      JOIN employee e ON f.employee_id = e.employee_id
      SET f.university_id = e.university_id, f.institute_id = e.institute_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE holiday h
      JOIN institute i ON h.institute_id = i.institute_id
      SET h.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE internal_assessment i
      JOIN subject s ON i.subject_id = s.subject_id
      SET i.university_id = s.university_id, i.institute_id = s.institute_id, i.acedmic_year_id = s.acedmic_year_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE syllabus_details s_d
      JOIN subject s ON s_d.subject_id = s.subject_id
      SET s_d.university_id = s.university_id, s_d.institute_id = s.institute_id, s_d.acedmic_year_id = s.acedmic_year_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE syllabus s
      JOIN institute i ON s.institute_id = i.institute_id
      SET s.university_id = i.university_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE teacher_attendence t
      JOIN schedule_assign sa ON t.schedule_assign_id = sa.schedule_assign_id
      JOIN schedule s ON sa.schedule_id = s.schedule_id
      SET t.university_id = s.university_id, t.institute_id = s.institute_id, t.acedmic_year_id = s.acedmic_year_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE time_table_structure_periods t
      JOIN time_table_structure s ON t.time_table_name_id = s.time_table_name_id
      SET t.university_id = s.university_id, t.institute_id = s.institute_id, t.acedmic_year_id = s.acedmic_year_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE class_student_mapper c
      JOIN students s ON c.student_id = s.student_id
      SET c.institute_id = s.institute_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE class_subject_mapper c
      JOIN subject s ON c.subject_id = s.subject_id
      SET c.university_id = s.university_id, c.acedmic_year_id = s.acedmic_year_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE session_course_mapping s
      JOIN session sn ON s.session_id = sn.session_id
      SET s.acedmic_year_id = sn.acedmic_year_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE teacher_exam_assignment t
      JOIN employee e ON t.employee_id = e.employee_id
      SET t.university_id = e.university_id, t.institute_id = e.institute_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE teacher_section_mapping t
      JOIN class_sections c ON t.class_sections_id = c.class_sections_id
      JOIN institute i ON c.institute_id = i.institute_id
      SET t.institute_id = c.institute_id, t.acedmic_year_id = c.acedmic_year_id, t.university_id = i.university_id
    `);
  },

  async down(queryInterface, Sequelize) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('attendance', 'acedmic_year_id');
    await removeColumnIfExists('assessment_evalution', 'university_id');
    await removeColumnIfExists('assessment_evalution', 'institute_id');
    await removeColumnIfExists('assessment_evalution', 'acedmic_year_id');
    await removeColumnIfExists('class_schedule_item', 'university_id');
    await removeColumnIfExists('class_schedule_item', 'institute_id');
    await removeColumnIfExists('class_schedule_item', 'acedmic_year_id');
    await removeColumnIfExists('evalutions', 'acedmic_year_id');
    await removeColumnIfExists('faculity_load', 'university_id');
    await removeColumnIfExists('faculity_load', 'institute_id');
    await removeColumnIfExists('faculity_load', 'acedmic_year_id');
    await removeColumnIfExists('holiday', 'university_id');
    await removeColumnIfExists('internal_assessment', 'university_id');
    await removeColumnIfExists('internal_assessment', 'institute_id');
    await removeColumnIfExists('internal_assessment', 'acedmic_year_id');
    await removeColumnIfExists('syllabus_details', 'university_id');
    await removeColumnIfExists('syllabus_details', 'institute_id');
    await removeColumnIfExists('syllabus_details', 'acedmic_year_id');
    await removeColumnIfExists('syllabus', 'university_id');
    await removeColumnIfExists('teacher_attendence', 'university_id');
    await removeColumnIfExists('teacher_attendence', 'institute_id');
    await removeColumnIfExists('teacher_attendence', 'acedmic_year_id');
    await removeColumnIfExists('time_table_structure_periods', 'university_id');
    await removeColumnIfExists('time_table_structure_periods', 'institute_id');
    await removeColumnIfExists('time_table_structure_periods', 'acedmic_year_id');
    await removeColumnIfExists('class_student_mapper', 'institute_id');
    await removeColumnIfExists('class_subject_mapper', 'university_id');
    await removeColumnIfExists('class_subject_mapper', 'acedmic_year_id');
    await removeColumnIfExists('session_course_mapping', 'acedmic_year_id');
    await removeColumnIfExists('teacher_exam_assignment', 'university_id');
    await removeColumnIfExists('teacher_exam_assignment', 'institute_id');
    await removeColumnIfExists('teacher_section_mapping', 'university_id');
    await removeColumnIfExists('teacher_section_mapping', 'institute_id');
    await removeColumnIfExists('teacher_section_mapping', 'acedmic_year_id');
  }
};

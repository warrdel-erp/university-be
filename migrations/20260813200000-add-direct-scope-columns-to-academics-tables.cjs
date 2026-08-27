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
          references: referenceModel ? {
            model: referenceModel,
            key: referenceKey
          } : undefined
        });
      }
    };

    // Add missing scope columns
    await addColumnIfNotExists('subject', 'department_id', 'department', 'department_id');

    await addColumnIfNotExists('credits', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('credits', 'department_id', 'department', 'department_id');

    await addColumnIfNotExists('syllabus', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('syllabus', 'department_id', 'department', 'department_id');

    await addColumnIfNotExists('elective_subject', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('elective_subject', 'department_id', 'department', 'department_id');

    await addColumnIfNotExists('class_sections', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('class_sections', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('class_sections', 'department_id', 'department', 'department_id');

    await addColumnIfNotExists('co', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('co', 'department_id', 'department', 'department_id');
    await addColumnIfNotExists('co', 'course_id', 'course', 'course_id');

    await addColumnIfNotExists('time_table_structure', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('time_table_structure', 'department_id', 'department', 'department_id');

    await addColumnIfNotExists('time_table_routine', 'department_id', 'department', 'department_id');

    await addColumnIfNotExists('faculity_load', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('faculity_load', 'department_id', 'department', 'department_id');

    await addColumnIfNotExists('lesson', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('lesson', 'department_id', 'department', 'department_id');

    await addColumnIfNotExists('academic_group', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('academic_group', 'department_id', 'department', 'department_id');

    // BACKFILL QUERIES

    await queryInterface.sequelize.query(`
      UPDATE subject s
      JOIN course c ON s.course_id = c.course_id
      SET s.department_id = c.department_id
      WHERE s.department_id IS NULL AND c.department_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE credits cr
      JOIN course c ON cr.course_id = c.course_id
      LEFT JOIN institute i ON cr.institute_id = i.institute_id
      SET cr.department_id = c.department_id, cr.campus_id = i.campus_id
      WHERE cr.department_id IS NULL OR cr.campus_id IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE syllabus s
      JOIN course c ON s.course_id = c.course_id
      LEFT JOIN institute i ON s.institute_id = i.institute_id
      SET s.department_id = c.department_id, s.campus_id = i.campus_id
      WHERE s.department_id IS NULL OR s.campus_id IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE elective_subject e
      LEFT JOIN course c ON e.course_id = c.course_id
      LEFT JOIN institute i ON e.institute_id = i.institute_id
      SET e.department_id = c.department_id, e.campus_id = i.campus_id
      WHERE e.department_id IS NULL OR e.campus_id IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE class_sections cs
      JOIN course c ON cs.course_id = c.course_id
      LEFT JOIN institute i ON cs.institute_id = i.institute_id
      SET cs.department_id = c.department_id, cs.campus_id = i.campus_id, cs.university_id = i.university_id
      WHERE cs.department_id IS NULL OR cs.campus_id IS NULL OR cs.university_id IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE co
      JOIN subject s ON co.subject_id = s.subject_id
      JOIN course c ON s.course_id = c.course_id
      LEFT JOIN institute i ON co.institute_id = i.institute_id
      SET co.course_id = s.course_id, co.department_id = c.department_id, co.campus_id = i.campus_id
      WHERE co.department_id IS NULL OR co.campus_id IS NULL OR co.course_id IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE time_table_structure t
      LEFT JOIN institute i ON t.institute_id = i.institute_id
      SET t.campus_id = i.campus_id
      WHERE t.campus_id IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE time_table_routine t
      LEFT JOIN course c ON t.course_id = c.course_id
      SET t.department_id = c.department_id
      WHERE t.department_id IS NULL AND c.department_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE faculity_load f
      LEFT JOIN institute i ON f.institute_id = i.institute_id
      SET f.campus_id = i.campus_id
      WHERE f.campus_id IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE lesson l
      JOIN subject s ON l.subject_id = s.subject_id
      JOIN course c ON s.course_id = c.course_id
      LEFT JOIN institute i ON l.institute_id = i.institute_id
      SET l.department_id = c.department_id, l.campus_id = i.campus_id
      WHERE l.department_id IS NULL OR l.campus_id IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE academic_group a
      LEFT JOIN institute i ON a.institute_id = i.institute_id
      SET a.campus_id = i.campus_id
      WHERE a.campus_id IS NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('subject', 'department_id');
    await removeColumnIfExists('credits', 'campus_id');
    await removeColumnIfExists('credits', 'department_id');
    await removeColumnIfExists('syllabus', 'campus_id');
    await removeColumnIfExists('syllabus', 'department_id');
    await removeColumnIfExists('elective_subject', 'campus_id');
    await removeColumnIfExists('elective_subject', 'department_id');
    await removeColumnIfExists('class_sections', 'university_id');
    await removeColumnIfExists('class_sections', 'campus_id');
    await removeColumnIfExists('class_sections', 'department_id');
    await removeColumnIfExists('co', 'campus_id');
    await removeColumnIfExists('co', 'department_id');
    await removeColumnIfExists('co', 'course_id');
    await removeColumnIfExists('time_table_structure', 'campus_id');
    await removeColumnIfExists('time_table_structure', 'department_id');
    await removeColumnIfExists('time_table_routine', 'department_id');
    await removeColumnIfExists('faculity_load', 'campus_id');
    await removeColumnIfExists('faculity_load', 'department_id');
    await removeColumnIfExists('lesson', 'campus_id');
    await removeColumnIfExists('lesson', 'department_id');
    await removeColumnIfExists('academic_group', 'campus_id');
    await removeColumnIfExists('academic_group', 'department_id');
  }
};

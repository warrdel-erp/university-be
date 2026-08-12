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
    await addColumnIfNotExists('exam_attendance', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('exam_attendance', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    
    await addColumnIfNotExists('exam_schedule', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('exam_schedule', 'institute_id', 'institute', 'institute_id');
    
    await addColumnIfNotExists('exam_schedule_room_capacity', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('exam_schedule_room_capacity', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('exam_schedule_room_capacity', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    
    await addColumnIfNotExists('exam_setup', 'university_id', 'university', 'university_id');
    await addColumnIfNotExists('exam_setup', 'institute_id', 'institute', 'institute_id');
    await addColumnIfNotExists('exam_setup', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    
    await addColumnIfNotExists('exam_setup_type', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');
    
    await addColumnIfNotExists('student_hall_ticket', 'acedmic_year_id', 'acedmic_year', 'acedmic_year_id');


    // BACKFILL QUERIES

    // Backfill exam_setup FIRST, because exam_attendance depends on it
    await queryInterface.sequelize.query(`
      UPDATE exam_setup e
      JOIN subject s ON e.subject_id = s.subject_id
      SET e.university_id = s.university_id, e.institute_id = s.institute_id, e.acedmic_year_id = s.acedmic_year_id
    `);

    // Backfill exam_attendance from exam_setup
    await queryInterface.sequelize.query(`
      UPDATE exam_attendance a
      JOIN exam_setup s ON a.exam_setup_id = s.exam_setup_id
      SET a.university_id = s.university_id, a.acedmic_year_id = s.acedmic_year_id
    `);

    // Backfill exam_schedule from subject FIRST, because room_capacity depends on it
    await queryInterface.sequelize.query(`
      UPDATE exam_schedule e
      JOIN subject s ON e.subject_id = s.subject_id
      SET e.university_id = s.university_id, e.institute_id = s.institute_id
    `);

    // Backfill exam_schedule_room_capacity from exam_schedule
    await queryInterface.sequelize.query(`
      UPDATE exam_schedule_room_capacity c
      JOIN exam_schedule s ON c.exam_schedule_id = s.exam_schedule_id
      SET c.university_id = s.university_id, c.institute_id = s.institute_id, c.acedmic_year_id = s.acedmic_year_id
    `);

    // Backfill student_hall_ticket from session
    await queryInterface.sequelize.query(`
      UPDATE student_hall_ticket s
      JOIN session sn ON s.session_id = sn.session_id
      SET s.acedmic_year_id = sn.acedmic_year_id
    `);

    // Note: exam_setup_type academicYearId cannot be backfilled reliably, left as NULL
  },

  async down(queryInterface, Sequelize) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('exam_attendance', 'university_id');
    await removeColumnIfExists('exam_attendance', 'acedmic_year_id');
    await removeColumnIfExists('exam_schedule', 'university_id');
    await removeColumnIfExists('exam_schedule', 'institute_id');
    await removeColumnIfExists('exam_schedule_room_capacity', 'university_id');
    await removeColumnIfExists('exam_schedule_room_capacity', 'institute_id');
    await removeColumnIfExists('exam_schedule_room_capacity', 'acedmic_year_id');
    await removeColumnIfExists('exam_setup', 'university_id');
    await removeColumnIfExists('exam_setup', 'institute_id');
    await removeColumnIfExists('exam_setup', 'acedmic_year_id');
    await removeColumnIfExists('exam_setup_type', 'acedmic_year_id');
    await removeColumnIfExists('student_hall_ticket', 'acedmic_year_id');
  }
};

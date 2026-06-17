'use strict';

/** Align students.student_status ENUM with constant.js (active, deactive, transferred, graduated). */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE students
      MODIFY COLUMN student_status
      ENUM(
        'Cancel Student',
        'Left Student',
        'Long Absent',
        'Non Attendant',
        'active',
        'deactive',
        'transferred',
        'graduated'
      ) NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE students
      MODIFY COLUMN student_status
      ENUM(
        'Cancel Student',
        'Left Student',
        'Long Absent',
        'Non Attendant'
      ) NULL
    `);
  },
};

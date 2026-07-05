'use strict';

/** Add alumni to students.student_status ENUM (see constant.js STUDENT_STATUS_OPTIONS). */

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
        'graduated',
        'alumni'
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
        'Non Attendant',
        'active',
        'deactive',
        'transferred',
        'graduated'
      ) NULL
    `);
  },
};

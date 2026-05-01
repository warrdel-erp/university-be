'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {


    // Step 2: Add the unique constraint
    await queryInterface.addIndex('teacher_exam_assignment', {
      fields: ['exam_schedule_id', 'employee_id'],
      unique: true,
      name: 'uq_teacher_exam_assignment_schedule_employee'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'teacher_exam_assignment',
      'uq_teacher_exam_assignment_schedule_employee'
    );
  }
};

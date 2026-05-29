'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('s3_files', 'entity_type', {
      type: Sequelize.ENUM('student_photo', 'employee_document', 'FULL_EXAM_ANSWER_SHEET_PDF', 'answer_sheet', 'student'),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('s3_files', 'entity_type', {
      type: Sequelize.STRING(50),
      allowNull: false,
    });
  }
};

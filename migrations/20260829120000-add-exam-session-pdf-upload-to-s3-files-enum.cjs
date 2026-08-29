'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Temporarily widen column to VARCHAR(100) to prevent truncation errors on existing data
    await queryInterface.sequelize.query(`
      ALTER TABLE s3_files MODIFY COLUMN entity_type VARCHAR(100) NOT NULL;
    `);

    // 2. Migrate any legacy FULL_EXAM_ANSWER_SHEET_PDF values to EXAM_SESSION_PDF_UPLOAD
    await queryInterface.sequelize.query(`
      UPDATE s3_files 
      SET entity_type = 'EXAM_SESSION_PDF_UPLOAD' 
      WHERE entity_type = 'FULL_EXAM_ANSWER_SHEET_PDF';
    `);

    // 3. Convert to updated ENUM including all supported values
    await queryInterface.changeColumn('s3_files', 'entity_type', {
      type: Sequelize.ENUM(
        'student_photo',
        'employee_document',
        'FULL_EXAM_ANSWER_SHEET_PDF',
        'EXAM_SESSION_PDF_UPLOAD',
        'answer_sheet',
        'student'
      ),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE s3_files MODIFY COLUMN entity_type VARCHAR(100) NOT NULL;
    `);

    await queryInterface.changeColumn('s3_files', 'entity_type', {
      type: Sequelize.ENUM(
        'student_photo',
        'employee_document',
        'FULL_EXAM_ANSWER_SHEET_PDF',
        'answer_sheet',
        'student'
      ),
      allowNull: false,
    });
  }
};

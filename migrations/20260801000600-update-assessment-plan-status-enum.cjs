'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update status values in existing rows to 'Draft' or 'Published'
    await queryInterface.sequelize.query(`
      UPDATE assessment_plan 
      SET status = 'Draft' 
      WHERE status NOT IN ('Draft', 'Published')
    `);

    // Alter column status ENUM in assessment_plan table
    await queryInterface.changeColumn('assessment_plan', 'status', {
      type: Sequelize.ENUM('Draft', 'Published'),
      allowNull: false,
      defaultValue: 'Draft',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('assessment_plan', 'status', {
      type: Sequelize.ENUM('Draft', 'Active', 'Archived', 'Published'),
      allowNull: false,
      defaultValue: 'Draft',
    });
  }
};

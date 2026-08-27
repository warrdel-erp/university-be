'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('question_paper', 'remarks', {
        type: Sequelize.TEXT,
        allowNull: true
      });

      await queryInterface.addColumn('question_paper', 'final_status', {
        type: Sequelize.ENUM('Pending', 'Approved', 'Rejected'),
        allowNull: true,
        defaultValue: 'Pending',
        field: 'final_status'
      });

    } catch (e) {}
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('question_paper', 'remarks');
await queryInterface.removeColumn('question_paper', 'final_status');
    } catch (e) {}
  }
};

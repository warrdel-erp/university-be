'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('question_bank', 'status', {
      type: Sequelize.ENUM('Pending', 'Approved', 'Rejected'),
      allowNull: false,
      defaultValue: 'Pending'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('question_bank', 'status');
    // Note: To truly remove ENUM types in some DBs like Postgres, 
    // you might need additional commands, but for simple use cases
    // removeColumn is sufficient for the table.
  }
};

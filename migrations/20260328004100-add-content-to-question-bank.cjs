'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('question_bank', 'content', {
      type: Sequelize.JSON,
      allowNull: true,
      field: 'content'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('question_bank', 'content');
  }
};

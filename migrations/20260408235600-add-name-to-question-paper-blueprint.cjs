'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('question_paper_blueprint', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
      after: 'id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('question_paper_blueprint', 'name');
  }
};

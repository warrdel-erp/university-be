'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('question_paper', 'blueprint_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'question_paper_blueprint',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('question_paper', 'blueprint_id');
  }
};

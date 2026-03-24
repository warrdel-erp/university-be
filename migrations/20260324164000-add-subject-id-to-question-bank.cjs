'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('question_bank', 'subject_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'subject',
        key: 'subject_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('question_bank', 'subject_id');
  }
};

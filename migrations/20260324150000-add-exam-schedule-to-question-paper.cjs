'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('question_paper', 'exam_schedule_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'exam_schedule',
        key: 'exam_schedule_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('question_paper', 'exam_schedule_id');
  }
};

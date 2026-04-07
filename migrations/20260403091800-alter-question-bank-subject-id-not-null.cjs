'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('question_bank', 'subject_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'subject',
        key: 'subject_id',
      },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('question_bank', 'subject_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'subject',
        key: 'subject_id',
      },
    });
  }
};

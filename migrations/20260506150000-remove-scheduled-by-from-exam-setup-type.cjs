'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('exam_setup_type', 'scheduled_by');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('exam_setup_type', 'scheduled_by', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};

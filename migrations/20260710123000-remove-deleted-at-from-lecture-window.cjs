'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('lecture_window', 'deleted_at');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('lecture_window', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
};

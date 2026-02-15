'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('course', 'total_semester', 'total_terms');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn('course', 'total_terms', 'total_semester');
  }
};

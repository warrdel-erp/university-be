'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameTable('time_table_mapping', 'class_schedule_item');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameTable('class_schedule_item', 'time_table_mapping');
  },
};

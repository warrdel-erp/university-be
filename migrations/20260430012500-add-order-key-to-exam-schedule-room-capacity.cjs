'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('exam_schedule_room_capacity');
    if (!table.order_key) {
      await queryInterface.addColumn('exam_schedule_room_capacity', 'order_key', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('exam_schedule_room_capacity');
    if (table.order_key) {
      await queryInterface.removeColumn('exam_schedule_room_capacity', 'order_key');
    }
  }
};

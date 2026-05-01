'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('exam_schedule', 'exam_room_capacity_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'exam_room_capacity',
        key: 'exam_room_capacity_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('exam_schedule', 'exam_room_capacity_id');
  }
};

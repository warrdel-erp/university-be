'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('class_room_section', 'exam_capacity', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'capacity'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('class_room_section', 'exam_capacity');
  }
};

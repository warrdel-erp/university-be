"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add the status column to exam_schedule_room_capacity table
    await queryInterface.addColumn("exam_schedule_room_capacity", "status", {
      type: Sequelize.ENUM("NOT_GENERATED", "GENERATED", "IN_PROGRESS", "SUBMITTED", "VERIFIED"),
      allowNull: false,
      defaultValue: "NOT_GENERATED"
    }).catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("exam_schedule_room_capacity", "status").catch(() => {});
  }
};

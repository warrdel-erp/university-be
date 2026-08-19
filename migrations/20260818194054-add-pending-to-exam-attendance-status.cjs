"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("exam_attendance", "attendance_status", {
      type: Sequelize.ENUM("PRESENT", "ABSENT", "PENDING"),
      allowNull: false,
      defaultValue: "PENDING"
    }).catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("exam_attendance", "attendance_status", {
      type: Sequelize.ENUM("PRESENT", "ABSENT"),
      allowNull: false
    }).catch(() => {});
  }
};

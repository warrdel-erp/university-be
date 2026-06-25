'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "UPDATE attendance SET attendance_status = 'Medical Leave' WHERE attendance_status = 'Medical';",
    );
    await queryInterface.sequelize.query(
      "UPDATE attendance SET attendance_status = 'Present' WHERE attendance_status = 'Late';",
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE attendance MODIFY attendance_status ENUM("
        + "'Present', "
        + "'Absent', "
        + "'Medical Leave', "
        + "'Duty Leave', "
        + "'Sports Leave', "
        + "'NCC Leave', "
        + "'Approved Leave', "
        + "'Holiday'"
        + ") NOT NULL DEFAULT 'Present';",
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "UPDATE attendance SET attendance_status = 'Medical' WHERE attendance_status = 'Medical Leave';",
    );
    await queryInterface.sequelize.query(
      "UPDATE attendance SET attendance_status = 'Present' WHERE attendance_status IN ("
        + "'Sports Leave', 'NCC Leave', 'Approved Leave', 'Holiday'"
        + ");",
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE attendance MODIFY attendance_status ENUM("
        + "'Present', 'Late', 'Absent', 'Medical', 'Duty Leave'"
        + ") NOT NULL DEFAULT 'Present';",
    );
  },
};

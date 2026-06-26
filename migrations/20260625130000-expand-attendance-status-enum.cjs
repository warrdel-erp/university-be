'use strict';

const NEW_ATTENDANCE_STATUSES = [
  'Present',
  'Absent',
  'Medical Leave',
  'Duty Leave',
  'Sports Leave',
  'NCC Leave',
  'Approved Leave',
  'Holiday',
];

const NEW_ENUM_SQL = NEW_ATTENDANCE_STATUSES.map((s) => `'${s}'`).join(', ');

const OLD_ENUM_SQL = "'Present', 'Late', 'Absent', 'Medical', 'Duty Leave'";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Widen first — cannot SET 'Medical Leave' while column is still the old ENUM.
    await queryInterface.sequelize.query(
      "ALTER TABLE attendance MODIFY attendance_status VARCHAR(255) NOT NULL DEFAULT 'Present';",
    );

    await queryInterface.sequelize.query(
      "UPDATE attendance SET attendance_status = 'Medical Leave' WHERE attendance_status = 'Medical';",
    );
    await queryInterface.sequelize.query(
      "UPDATE attendance SET attendance_status = 'Present' WHERE attendance_status = 'Late';",
    );
    await queryInterface.sequelize.query(
      "UPDATE attendance SET attendance_status = 'Present' WHERE attendance_status IS NULL OR attendance_status = '';",
    );
    await queryInterface.sequelize.query(
      `UPDATE attendance SET attendance_status = 'Present' WHERE attendance_status NOT IN (${NEW_ENUM_SQL});`,
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE attendance MODIFY attendance_status ENUM(${NEW_ENUM_SQL}) NOT NULL DEFAULT 'Present';`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE attendance MODIFY attendance_status VARCHAR(255) NOT NULL DEFAULT 'Present';",
    );

    await queryInterface.sequelize.query(
      "UPDATE attendance SET attendance_status = 'Medical' WHERE attendance_status = 'Medical Leave';",
    );
    await queryInterface.sequelize.query(
      "UPDATE attendance SET attendance_status = 'Present' WHERE attendance_status IN ("
        + "'Sports Leave', 'NCC Leave', 'Approved Leave', 'Holiday'"
        + ");",
    );
    await queryInterface.sequelize.query(
      `UPDATE attendance SET attendance_status = 'Present' WHERE attendance_status NOT IN (${OLD_ENUM_SQL});`,
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE attendance MODIFY attendance_status ENUM(${OLD_ENUM_SQL}) NOT NULL DEFAULT 'Present';`,
    );
  },
};

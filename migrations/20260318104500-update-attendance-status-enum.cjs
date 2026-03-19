'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Update existing NULL values to 'Present'
        await queryInterface.sequelize.query(
            "UPDATE attendance SET attendance_status = 'Present' WHERE attendance_status IS NULL OR attendance_status = '';"
        );

        // 2. Modify the column to ENUM and NOT NULL
        await queryInterface.sequelize.query(
            "ALTER TABLE attendance MODIFY attendance_status ENUM('Present', 'Late', 'Absent', 'Medical', 'Duty Leave') NOT NULL DEFAULT 'Present';"
        );
    },

    async down(queryInterface, Sequelize) {
        // Revert to nullable string
        await queryInterface.sequelize.query(
            "ALTER TABLE attendance MODIFY attendance_status VARCHAR(255) NULL;"
        );
    }
};

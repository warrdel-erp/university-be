'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Using raw SQL because changeColumn often fails to update nullability in MySQL with foreign keys
        await queryInterface.sequelize.query('ALTER TABLE class_student_mapper MODIFY semester_id INT NULL;');
    },

    async down(queryInterface, Sequelize) {
        // To revert, it must be NOT NULL. 
        // Note: This might fail if there are already NULL values in the database.
        await queryInterface.sequelize.query('ALTER TABLE class_student_mapper MODIFY semester_id INT NOT NULL;');
    }
};

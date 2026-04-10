'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Using raw SQL because changeColumn often fails to update nullability in MySQL with foreign keys
        await queryInterface.sequelize.query('ALTER TABLE students MODIFY semester_id INT NULL;');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query('ALTER TABLE students MODIFY semester_id INT NOT NULL;');
    }
};

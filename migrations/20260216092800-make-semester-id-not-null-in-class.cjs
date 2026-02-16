'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.query('ALTER TABLE class MODIFY semester_id INT NULL;');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query('ALTER TABLE class MODIFY semester_id INT NOT NULL;');
    }
};

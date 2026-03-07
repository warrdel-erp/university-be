'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.renameTable('time_table_create', 'time_table_routine');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.renameTable('time_table_routine', 'time_table_create');
    },
};

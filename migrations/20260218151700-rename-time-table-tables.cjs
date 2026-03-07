'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.renameTable('time_table_name', 'time_table_structure');
        await queryInterface.renameTable('time_table_creation', 'time_table_structure_periods');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.renameTable('time_table_structure', 'time_table_name');
        await queryInterface.renameTable('time_table_structure_periods', 'time_table_creation');
    }
};

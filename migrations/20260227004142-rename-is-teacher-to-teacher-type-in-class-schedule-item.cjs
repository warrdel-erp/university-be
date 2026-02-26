'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tableDefinition = await queryInterface.describeTable('class_schedule_item');
        if (tableDefinition.is_teacher) {
            await queryInterface.renameColumn('class_schedule_item', 'is_teacher', 'teacher_type');
        }
    },

    async down(queryInterface, Sequelize) {
        const tableDefinition = await queryInterface.describeTable('class_schedule_item');
        if (tableDefinition.teacher_type) {
            await queryInterface.renameColumn('class_schedule_item', 'teacher_type', 'is_teacher');
        }
    }
};

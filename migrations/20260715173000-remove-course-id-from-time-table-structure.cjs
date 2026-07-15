'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableDefinition = await queryInterface.describeTable('time_table_structure');

    if (tableDefinition.course_id) {
      await queryInterface.removeColumn('time_table_structure', 'course_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('time_table_structure');

    if (!tableDefinition.course_id) {
      await queryInterface.addColumn('time_table_structure', 'course_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'course',
          key: 'course_id',
        },
      });
    }
  },
};

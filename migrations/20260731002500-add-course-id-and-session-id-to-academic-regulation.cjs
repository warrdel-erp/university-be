'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (!tableInfo.course_id) {
      await queryInterface.addColumn('academic_regulation', 'course_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'course',
          key: 'course_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    if (!tableInfo.session_id) {
      await queryInterface.addColumn('academic_regulation', 'session_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'session',
          key: 'session_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('academic_regulation');

    if (tableInfo.session_id) {
      await queryInterface.removeColumn('academic_regulation', 'session_id');
    }
    if (tableInfo.course_id) {
      await queryInterface.removeColumn('academic_regulation', 'course_id');
    }
  }
};

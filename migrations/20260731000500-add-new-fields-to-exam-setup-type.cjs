'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('exam_setup_type');

    if (!tableInfo.exam_code) {
      await queryInterface.addColumn('exam_setup_type', 'exam_code', {
        type: Sequelize.STRING(30),
        allowNull: true,
      });
    }

    if (!tableInfo.exam_category) {
      await queryInterface.addColumn('exam_setup_type', 'exam_category', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (!tableInfo.exam_subcategory) {
      await queryInterface.addColumn('exam_setup_type', 'exam_subcategory', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (!tableInfo.exam_description) {
      await queryInterface.addColumn('exam_setup_type', 'exam_description', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    }

    if (!tableInfo.course_id) {
      await queryInterface.addColumn('exam_setup_type', 'course_id', {
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
      await queryInterface.addColumn('exam_setup_type', 'session_id', {
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
    const tableInfo = await queryInterface.describeTable('exam_setup_type');
    if (tableInfo.exam_code) await queryInterface.removeColumn('exam_setup_type', 'exam_code');
    if (tableInfo.exam_category) await queryInterface.removeColumn('exam_setup_type', 'exam_category');
    if (tableInfo.exam_subcategory) await queryInterface.removeColumn('exam_setup_type', 'exam_subcategory');
    if (tableInfo.exam_description) await queryInterface.removeColumn('exam_setup_type', 'exam_description');
    if (tableInfo.course_id) await queryInterface.removeColumn('exam_setup_type', 'course_id');
    if (tableInfo.session_id) await queryInterface.removeColumn('exam_setup_type', 'session_id');
  }
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableInfo = await queryInterface.describeTable('class_room_section', { transaction });

      if (tableInfo.exam_capacity) {
        await queryInterface.changeColumn('class_room_section', 'exam_capacity', {
          type: Sequelize.INTEGER,
          allowNull: true
        }, { transaction });
      } else {
        await queryInterface.addColumn('class_room_section', 'exam_capacity', {
          type: Sequelize.INTEGER,
          allowNull: true,
          after: 'capacity'
        }, { transaction });
      }

      if (tableInfo.exam_capacity_columns) {
        await queryInterface.changeColumn('class_room_section', 'exam_capacity_columns', {
          type: Sequelize.INTEGER,
          allowNull: true
        }, { transaction });
      } else {
        await queryInterface.addColumn('class_room_section', 'exam_capacity_columns', {
          type: Sequelize.INTEGER,
          allowNull: true,
          after: 'exam_capacity'
        }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableInfo = await queryInterface.describeTable('class_room_section', { transaction });

      if (tableInfo.exam_capacity) {
        await queryInterface.changeColumn('class_room_section', 'exam_capacity', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        }, { transaction });
      }

      if (tableInfo.exam_capacity_columns) {
        await queryInterface.changeColumn('class_room_section', 'exam_capacity_columns', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

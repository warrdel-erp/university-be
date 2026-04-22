'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.changeColumn('class_room_section', 'exam_capacity', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });

      await queryInterface.changeColumn('class_room_section', 'exam_capacity_columns', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.changeColumn('class_room_section', 'exam_capacity', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }, { transaction });

      await queryInterface.changeColumn('class_room_section', 'exam_capacity_columns', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

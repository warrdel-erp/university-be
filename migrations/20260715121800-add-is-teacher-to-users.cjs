'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('users').catch(() => null);
    if (tableInfo && !tableInfo.is_teacher) {
      await queryInterface.addColumn('users', 'is_teacher', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });

      // Set is_teacher to true for users who have a corresponding record in the employee table
      await queryInterface.sequelize.query(`
        UPDATE users u
        INNER JOIN employee e ON u.user_id = e.user_id
        SET u.is_teacher = true
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('users').catch(() => null);
    if (tableInfo && tableInfo.is_teacher) {
      await queryInterface.removeColumn('users', 'is_teacher');
    }
  }
};

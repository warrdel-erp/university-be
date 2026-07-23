'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add user_id column
    await queryInterface.addColumn('lesson', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // 2. Backfill user_id from employee_id
    await queryInterface.sequelize.query(`
      UPDATE lesson l
      JOIN employee e ON e.employee_id = l.employee_id
      SET l.user_id = e.user_id
      WHERE l.employee_id IS NOT NULL AND l.user_id IS NULL;
    `);

    // 3. Make user_id NOT NULL
    await queryInterface.changeColumn('lesson', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('lesson', 'user_id');
  }
};

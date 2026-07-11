'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'lecture_window'
        AND COLUMN_NAME = 'employee_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const row of constraints) {
      await queryInterface.sequelize.query(
        `ALTER TABLE lecture_window DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``,
      );
    }

    await queryInterface.changeColumn('lecture_window', 'employee_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addConstraint('lecture_window', {
      fields: ['employee_id'],
      type: 'foreign key',
      name: 'fk_lecture_window_employee',
      references: {
        table: 'employee',
        field: 'employee_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('lecture_window', 'fk_lecture_window_employee');

    await queryInterface.changeColumn('lecture_window', 'employee_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.addConstraint('lecture_window', {
      fields: ['employee_id'],
      type: 'foreign key',
      name: 'fk_lecture_window_employee',
      references: {
        table: 'employee',
        field: 'employee_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },
};

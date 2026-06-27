'use strict';

/** Course links to program (sub_account), not department row. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('course');

    if (table.department_id && !table.sub_account_id) {
      await queryInterface.addColumn('course', 'sub_account_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sub_account',
          key: 'sub_account_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });

      await queryInterface.sequelize.query(`
        UPDATE course
        SET sub_account_id = department_id
        WHERE department_id IS NOT NULL
      `);

      await queryInterface.removeColumn('course', 'department_id');
      return;
    }

    if (!table.sub_account_id) {
      await queryInterface.addColumn('course', 'sub_account_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sub_account',
          key: 'sub_account_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('course');

    if (table.sub_account_id && !table.department_id) {
      await queryInterface.addColumn('course', 'department_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'department',
          key: 'department_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });

      await queryInterface.sequelize.query(`
        UPDATE course
        SET department_id = sub_account_id
        WHERE sub_account_id IS NOT NULL
      `);

      await queryInterface.removeColumn('course', 'sub_account_id');
    }
  },
};

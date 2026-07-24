'use strict';

/**
 * Create time_table_cell_teachers_date_wise (teachers on date instance).
 * Requires time_table_cell_date_wise.
 */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((t) => {
    const name = typeof t === 'string' ? t : t.tableName || t.name || Object.values(t)[0];
    return String(name).toLowerCase() === tableName.toLowerCase();
  });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (await tableExists(queryInterface, 'time_table_cell_teachers_date_wise')) {
      return;
    }
    if (!(await tableExists(queryInterface, 'time_table_cell_date_wise'))) {
      throw new Error('time_table_cell_date_wise missing — run 20260718142000 first');
    }

    await queryInterface.createTable('time_table_cell_teachers_date_wise', {
      time_table_cell_teachers_date_wise_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      time_table_cell_date_wise_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'time_table_cell_date_wise', key: 'time_table_cell_date_wise_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      teacher_type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Primary',
      },
      is_Attendence: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex(
      'time_table_cell_teachers_date_wise',
      ['time_table_cell_date_wise_id'],
      { name: 'idx_time_table_cell_teachers_date_wise_date_id' },
    );
    await queryInterface.addIndex(
      'time_table_cell_teachers_date_wise',
      ['user_id'],
      { name: 'idx_time_table_cell_teachers_date_wise_user_id' },
    );
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'time_table_cell_teachers_date_wise')) {
      await queryInterface.dropTable('time_table_cell_teachers_date_wise');
    }
  },
};

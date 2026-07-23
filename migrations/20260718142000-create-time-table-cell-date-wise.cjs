'use strict';

/** Create time_table_cell_date_wise (calendar instance). Requires time_table_cell. */

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
    if (await tableExists(queryInterface, 'time_table_cell_date_wise')) {
      return;
    }
    if (!(await tableExists(queryInterface, 'time_table_cell'))) {
      throw new Error('time_table_cell missing — run 20260718140000 first');
    }

    await queryInterface.createTable('time_table_cell_date_wise', {
      time_table_cell_date_wise_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      time_table_cell_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'time_table_cell', key: 'time_table_cell_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      class_room_section_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'class_room_section', key: 'class_room_section_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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
      'time_table_cell_date_wise',
      ['time_table_cell_id', 'date'],
      {
        name: 'uq_time_table_cell_date_wise_cell_date',
        unique: true,
      },
    );
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'time_table_cell_date_wise')) {
      await queryInterface.dropTable('time_table_cell_date_wise');
    }
  },
};

'use strict';

/** Create time_table_cell_teachers (teachers on week cell). Requires time_table_cell. */

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
    if (await tableExists(queryInterface, 'time_table_cell_teachers')) {
      return;
    }
    if (!(await tableExists(queryInterface, 'time_table_cell'))) {
      throw new Error('time_table_cell missing — run 20260718140000 first');
    }

    await queryInterface.createTable('time_table_cell_teachers', {
      time_table_cell_teacher_id: {
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

    await queryInterface.addIndex('time_table_cell_teachers', ['time_table_cell_id'], {
      name: 'idx_time_table_cell_teachers_cell_id',
    });
    await queryInterface.addIndex('time_table_cell_teachers', ['user_id'], {
      name: 'idx_time_table_cell_teachers_user_id',
    });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'time_table_cell_teachers')) {
      await queryInterface.dropTable('time_table_cell_teachers');
    }
  },
};

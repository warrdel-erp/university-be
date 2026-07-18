'use strict';

/** attendance: add time_table_cell_date_wise_id for date-wise class instances */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('attendance');

    if (!table.time_table_cell_date_wise_id) {
      await queryInterface.addColumn('attendance', 'time_table_cell_date_wise_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'time_table_cell_date_wise',
          key: 'time_table_cell_date_wise_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });

      await queryInterface.addIndex('attendance', ['time_table_cell_date_wise_id'], {
        name: 'idx_attendance_time_table_cell_date_wise_id',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('attendance');

    if (table.time_table_cell_date_wise_id) {
      await queryInterface.removeIndex(
        'attendance',
        'idx_attendance_time_table_cell_date_wise_id',
      );
      await queryInterface.removeColumn('attendance', 'time_table_cell_date_wise_id');
    }
  },
};

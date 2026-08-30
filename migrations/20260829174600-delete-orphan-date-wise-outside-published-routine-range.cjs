"use strict";

/**
 * Delete out-of-range time_table_cell_date_wise rows (and their teachers)
 * left after published routine date updates.
 * Run after 20260829174500 so attendance / lesson_mapping FKs are clear.
 */

module.exports = {
  up: async (queryInterface) => {
    const sequelize = queryInterface.sequelize;

    await sequelize.query(`
      DELETE t
      FROM time_table_cell_teachers_date_wise t
      INNER JOIN time_table_cell_date_wise dw
        ON dw.time_table_cell_date_wise_id = t.time_table_cell_date_wise_id
      INNER JOIN time_table_cell c
        ON c.time_table_cell_id = dw.time_table_cell_id
      INNER JOIN time_table_routine r
        ON r.time_table_routine_id = c.time_table_routine_id
      WHERE r.is_publish = 1
        AND (dw.date < r.starting_date OR dw.date > r.ending_date)
    `);

    await sequelize.query(`
      DELETE dw
      FROM time_table_cell_date_wise dw
      INNER JOIN time_table_cell c
        ON c.time_table_cell_id = dw.time_table_cell_id
      INNER JOIN time_table_routine r
        ON r.time_table_routine_id = c.time_table_routine_id
      WHERE r.is_publish = 1
        AND (dw.date < r.starting_date OR dw.date > r.ending_date)
    `);
  },

  down: async () => {},
};

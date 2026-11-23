"use strict";

/**
 * Migration: Remove all orphan time_table_cell_date_wise entries,
 * their associated teachers (time_table_cell_teachers_date_wise),
 * lesson mappings (lesson_mapping), and attendance records (attendance).
 *
 * An orphan date-wise row is defined as:
 * 1. A date-wise row whose parent week cell (time_table_cell) does not exist.
 * 2. A date-wise row whose routine (time_table_routine) does not exist.
 * 3. A date-wise row belonging to an unpublished routine (is_publish = 0 or NULL).
 * 4. A date-wise row whose date falls outside its published routine range (date < starting_date OR date > ending_date).
 */

module.exports = {
  up: async (queryInterface) => {
    const sequelize = queryInterface.sequelize;

    // 1. Drop temporary table if already exists in session
    await sequelize.query(`DROP TEMPORARY TABLE IF EXISTS temp_orphan_date_wise_ids`);

    // 2. Collect all distinct orphan date-wise IDs
    await sequelize.query(`
      CREATE TEMPORARY TABLE temp_orphan_date_wise_ids AS
      SELECT DISTINCT dw.time_table_cell_date_wise_id
      FROM time_table_cell_date_wise dw
      LEFT JOIN time_table_cell c
        ON c.time_table_cell_id = dw.time_table_cell_id
      LEFT JOIN time_table_routine r
        ON r.time_table_routine_id = c.time_table_routine_id
      WHERE c.time_table_cell_id IS NULL
         OR r.time_table_routine_id IS NULL
         OR (r.is_publish = 1 AND (dw.date < r.starting_date OR dw.date > r.ending_date))
         OR r.is_publish = 0
         OR r.is_publish IS NULL
    `);

    await sequelize.query(`
      ALTER TABLE temp_orphan_date_wise_ids ADD PRIMARY KEY (time_table_cell_date_wise_id)
    `);

    // 3. Delete attendance referencing orphan date-wise rows
    await sequelize.query(`
      DELETE a
      FROM attendance a
      INNER JOIN temp_orphan_date_wise_ids o
        ON o.time_table_cell_date_wise_id = a.time_table_cell_date_wise_id
    `);

    // 4. Delete lesson_mapping referencing orphan date-wise rows
    await sequelize.query(`
      DELETE lm
      FROM lesson_mapping lm
      INNER JOIN temp_orphan_date_wise_ids o
        ON o.time_table_cell_date_wise_id = lm.time_table_cell_date_wise_id
    `);

    // 5. Delete time_table_cell_teachers_date_wise referencing orphan date-wise rows
    await sequelize.query(`
      DELETE t
      FROM time_table_cell_teachers_date_wise t
      INNER JOIN temp_orphan_date_wise_ids o
        ON o.time_table_cell_date_wise_id = t.time_table_cell_date_wise_id
    `);

    // 6. Delete orphan time_table_cell_date_wise rows
    await sequelize.query(`
      DELETE dw
      FROM time_table_cell_date_wise dw
      INNER JOIN temp_orphan_date_wise_ids o
        ON o.time_table_cell_date_wise_id = dw.time_table_cell_date_wise_id
    `);

    // 7. Clean up temporary table
    await sequelize.query(`DROP TEMPORARY TABLE IF EXISTS temp_orphan_date_wise_ids`);
  },

  down: async () => {},
};

'use strict';

/**
 * Backfill time_table_structure.starting_date / ending_date from linked routines:
 *   starting_date = MIN(routine.starting_date)
 *   ending_date   = MAX(routine.ending_date)
 *
 * Depends on: 20260714120000-add-dates-to-time-table-structure.cjs
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE time_table_structure tts
      INNER JOIN (
        SELECT
          time_table_name_id,
          MIN(DATE(starting_date)) AS absolute_starting_date,
          MAX(DATE(ending_date)) AS absolute_ending_date
        FROM time_table_routine
        WHERE deleted_at IS NULL
          AND starting_date IS NOT NULL
          AND ending_date IS NOT NULL
        GROUP BY time_table_name_id
      ) r ON r.time_table_name_id = tts.time_table_name_id
      SET
        tts.starting_date = COALESCE(tts.starting_date, r.absolute_starting_date),
        tts.ending_date = COALESCE(tts.ending_date, r.absolute_ending_date)
      WHERE tts.deleted_at IS NULL
        AND (tts.starting_date IS NULL OR tts.ending_date IS NULL)
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE time_table_structure tts
      INNER JOIN (
        SELECT time_table_name_id
        FROM time_table_routine
        WHERE deleted_at IS NULL
          AND starting_date IS NOT NULL
          AND ending_date IS NOT NULL
        GROUP BY time_table_name_id
      ) r ON r.time_table_name_id = tts.time_table_name_id
      SET
        tts.starting_date = NULL,
        tts.ending_date = NULL
      WHERE tts.deleted_at IS NULL
    `);
  },
};

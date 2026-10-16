'use strict';

/**
 * Migration to safely backfill legacy timetable structure data into new variant tables:
 * 1. Create a default 'Regular' variant for every existing time_table_structure
 * 2. Copy all periods' start_time, end_time, is_course into time_table_structure_variant_periods
 * 3. Link all existing time_table_structure_course mappings to their default variant
 *
 * Idempotent: uses WHERE NOT EXISTS checks. Wrapped in a single database transaction.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Backfill time_table_structure_variant (Create default 'Regular' variant per structure)
      await queryInterface.sequelize.query(
        `
        INSERT INTO time_table_structure_variant 
          (name, time_table_structure_id, is_default, university_id, institute_id, acedmic_year_id, created_by, updated_by, created_at, updated_at)
        SELECT 
          'Regular', 
          tts.time_table_name_id, 
          true, 
          tts.university_id, 
          tts.institute_id, 
          tts.acedmic_year_id, 
          tts.created_by, 
          tts.updated_by, 
          NOW(), 
          NOW()
        FROM time_table_structure tts
        WHERE NOT EXISTS (
          SELECT 1 FROM time_table_structure_variant v 
          WHERE v.time_table_structure_id = tts.time_table_name_id
        )
        `,
        { transaction },
      );

      // 2. Backfill time_table_structure_variant_periods (Copy start_time, end_time, is_course)
      await queryInterface.sequelize.query(
        `
        INSERT INTO time_table_structure_variant_periods 
          (time_table_structure_variant_id, time_table_structure_periods_id, start_time, end_time, is_course, university_id, institute_id, acedmic_year_id, created_by, updated_by, created_at, updated_at)
        SELECT 
          v.time_table_structure_variant_id,
          p.time_table_creation_id,
          p.start_time,
          p.end_time,
          COALESCE(p.is_course, true),
          p.university_id,
          p.institute_id,
          p.acedmic_year_id,
          p.created_by,
          p.updated_by,
          NOW(),
          NOW()
        FROM time_table_structure_periods p
        JOIN time_table_structure_variant v 
          ON v.time_table_structure_id = p.time_table_name_id
        WHERE NOT EXISTS (
          SELECT 1 FROM time_table_structure_variant_periods vp
          WHERE vp.time_table_structure_variant_id = v.time_table_structure_variant_id
            AND vp.time_table_structure_periods_id = p.time_table_creation_id
        )
        `,
        { transaction },
      );

      // 3. Backfill time_table_structure_variant_course_mapping (Link existing course mappings)
      await queryInterface.sequelize.query(
        `
        INSERT INTO time_table_structure_variant_course_mapping 
          (timetable_structure_course_mapper_id, time_table_structure_variant_id, name, starting_date, ending_date, university_id, institute_id, acedmic_year_id, created_by, updated_by, created_at, updated_at)
        SELECT 
          c.timetable_structure_course_mapper_id,
          v.time_table_structure_variant_id,
          'Regular',
          c.starting_date,
          c.ending_date,
          c.university_id,
          c.institute_id,
          c.acedmic_year_id,
          c.created_by,
          c.updated_by,
          NOW(),
          NOW()
        FROM time_table_structure_course c
        JOIN time_table_structure_variant v 
          ON v.time_table_structure_id = c.time_table_name_id
        WHERE NOT EXISTS (
          SELECT 1 FROM time_table_structure_variant_course_mapping vcm
          WHERE vcm.timetable_structure_course_mapper_id = c.timetable_structure_course_mapper_id
            AND vcm.time_table_structure_variant_id = v.time_table_structure_variant_id
        )
        `,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Revert in reverse order
      await queryInterface.sequelize.query(
        `DELETE FROM time_table_structure_variant_course_mapping WHERE name = 'Regular'`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `DELETE FROM time_table_structure_variant_periods`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `DELETE FROM time_table_structure_variant WHERE is_default = true`,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

"use strict";

/** Link time_table_routine to time_table_structure_course via mapper PK. */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const routine = await queryInterface.describeTable("time_table_routine");

      if (!routine.timetable_structure_course_mapper_id) {
        // Add without FK first — auto FK name exceeds MySQL 64-char limit.

        await queryInterface.addColumn(
          "time_table_routine",

          "timetable_structure_course_mapper_id",

          {
            type: Sequelize.INTEGER,

            allowNull: true,
          },

          { transaction },
        );
      }

      const structure = await queryInterface.describeTable(
        "time_table_structure",
      );

      const hasStructureSession = Boolean(structure.session_id);

      // Match mapping by structure + course + resolvable session (section, then structure).

      await queryInterface.sequelize.query(
        `

        UPDATE time_table_routine r

        INNER JOIN time_table_structure_course m

          ON m.time_table_name_id = r.time_table_name_id

         AND m.course_id = r.course_id

         AND m.session_id = COALESCE(

           (

             SELECT cs.session_id

             FROM class_section_term cst

             INNER JOIN class_sections cs

               ON cs.class_sections_id = cst.class_sections_id

             WHERE cst.class_section_term_id = r.class_section_term_id

             LIMIT 1

           )

           ${hasStructureSession ? ", (SELECT s.session_id FROM time_table_structure s WHERE s.time_table_name_id = r.time_table_name_id LIMIT 1)" : ""}

         )

        SET r.timetable_structure_course_mapper_id = m.timetable_structure_course_mapper_id

        WHERE r.timetable_structure_course_mapper_id IS NULL

        `,

        { transaction },
      );

      // Fallback: if only one mapping exists for structure+course, use it.

      await queryInterface.sequelize.query(
        `

        UPDATE time_table_routine r

        INNER JOIN (

          SELECT time_table_name_id, course_id, MIN(timetable_structure_course_mapper_id) AS mapper_id

          FROM time_table_structure_course

          GROUP BY time_table_name_id, course_id

          HAVING COUNT(*) = 1

        ) only_one

          ON only_one.time_table_name_id = r.time_table_name_id

         AND only_one.course_id = r.course_id

        SET r.timetable_structure_course_mapper_id = only_one.mapper_id

        WHERE r.timetable_structure_course_mapper_id IS NULL

        `,

        { transaction },
      );

      const [unmapped] = await queryInterface.sequelize.query(
        `

        SELECT COUNT(*) AS cnt

        FROM time_table_routine

        WHERE timetable_structure_course_mapper_id IS NULL

        `,

        { transaction },
      );

      const remaining = Number(unmapped[0].cnt || unmapped[0].CNT || 0);

      if (remaining > 0) {
        throw new Error(
          `Cannot set mapper NOT NULL: ${remaining} routine(s) have no matching structure-course mapping`,
        );
      }

      await queryInterface.changeColumn(
        "time_table_routine",

        "timetable_structure_course_mapper_id",

        {
          type: Sequelize.INTEGER,

          allowNull: false,
        },

        { transaction },
      );

      await queryInterface.addConstraint("time_table_routine", {
        fields: ["timetable_structure_course_mapper_id"],

        type: "foreign key",

        name: "fk_routine_tts_course_mapper",

        references: {
          table: "time_table_structure_course",

          field: "timetable_structure_course_mapper_id",
        },

        onUpdate: "CASCADE",

        onDelete: "RESTRICT",

        transaction,
      });

      const indexes = await queryInterface.showIndex("time_table_routine");

      let hasIdx = false;

      for (const index of indexes) {
        if (index.name === "idx_routine_tts_course_mapper") {
          hasIdx = true;
        }
      }

      if (!hasIdx) {
        await queryInterface.addIndex(
          "time_table_routine",

          ["timetable_structure_course_mapper_id"],

          {
            name: "idx_routine_tts_course_mapper",

            transaction,
          },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeConstraint(
        "time_table_routine",

        "fk_routine_tts_course_mapper",

        { transaction },
      );

      await queryInterface.removeIndex(
        "time_table_routine",

        "idx_routine_tts_course_mapper",

        { transaction },
      );

      await queryInterface.removeColumn(
        "time_table_routine",

        "timetable_structure_course_mapper_id",

        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },
};

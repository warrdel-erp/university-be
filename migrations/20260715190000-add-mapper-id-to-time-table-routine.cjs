'use strict';

/**
 * 2/3 — Link routine → mapper, then drop routine.time_table_name_id + deleted_at.
 *
 * Session resolve: term → class_sections_id → structure.session_id
 * Fallbacks: single structure+course mapping → date-cover → any structure+course
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const routine = await queryInterface.describeTable('time_table_routine');

      if (!routine.timetable_structure_course_mapper_id) {
        await queryInterface.addColumn(
          'time_table_routine',
          'timetable_structure_course_mapper_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction },
        );
      }

      const routineAfter = await queryInterface.describeTable('time_table_routine');
      const hasRoutineNameId = Boolean(routineAfter.time_table_name_id);

      if (hasRoutineNameId) {
        const structure = await queryInterface.describeTable('time_table_structure');
        const hasStructureSession = Boolean(structure.session_id);
        const hasRoutineClassSectionsId = Boolean(routineAfter.class_sections_id);

        const sessionFromTerm = `
          (
            SELECT cs.session_id
            FROM class_section_term cst
            INNER JOIN class_sections cs ON cs.class_sections_id = cst.class_sections_id
            WHERE cst.class_section_term_id = r.class_section_term_id
            LIMIT 1
          )
        `;

        const sessionFromRoutineSection = hasRoutineClassSectionsId
          ? `
          (
            SELECT cs2.session_id
            FROM class_sections cs2
            WHERE cs2.class_sections_id = r.class_sections_id
            LIMIT 1
          )
          `
          : 'NULL';

        const sessionExpr = hasStructureSession
          ? `COALESCE(${sessionFromTerm}, ${sessionFromRoutineSection}, (
              SELECT s.session_id FROM time_table_structure s
              WHERE s.time_table_name_id = r.time_table_name_id LIMIT 1
            ))`
          : `COALESCE(${sessionFromTerm}, ${sessionFromRoutineSection})`;

        await queryInterface.sequelize.query(
          `
          UPDATE time_table_routine r
          INNER JOIN time_table_structure_course m
            ON m.time_table_name_id = r.time_table_name_id
           AND m.course_id = r.course_id
           AND m.session_id = ${sessionExpr}
          SET r.timetable_structure_course_mapper_id = m.timetable_structure_course_mapper_id
          WHERE r.timetable_structure_course_mapper_id IS NULL
            AND r.course_id IS NOT NULL
            AND ${sessionExpr} IS NOT NULL
          `,
          { transaction },
        );

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

        await queryInterface.sequelize.query(
          `
          UPDATE time_table_routine r
          INNER JOIN time_table_structure_course m
            ON m.time_table_name_id = r.time_table_name_id
           AND m.course_id = r.course_id
           AND r.starting_date IS NOT NULL
           AND r.ending_date IS NOT NULL
           AND DATE(r.starting_date) >= m.starting_date
           AND DATE(r.ending_date) <= m.ending_date
          SET r.timetable_structure_course_mapper_id = m.timetable_structure_course_mapper_id
          WHERE r.timetable_structure_course_mapper_id IS NULL
          `,
          { transaction },
        );

        await queryInterface.sequelize.query(
          `
          UPDATE time_table_routine r
          INNER JOIN (
            SELECT time_table_name_id, course_id, MIN(timetable_structure_course_mapper_id) AS mapper_id
            FROM time_table_structure_course
            GROUP BY time_table_name_id, course_id
          ) any_one
            ON any_one.time_table_name_id = r.time_table_name_id
           AND any_one.course_id = r.course_id
          SET r.timetable_structure_course_mapper_id = any_one.mapper_id
          WHERE r.timetable_structure_course_mapper_id IS NULL
          `,
          { transaction },
        );
      }

      // Expand mapper dates to cover linked routines
      await queryInterface.sequelize.query(
        `
        UPDATE time_table_structure_course m
        INNER JOIN (
          SELECT
            timetable_structure_course_mapper_id,
            MIN(DATE(starting_date)) AS min_start,
            MAX(DATE(ending_date)) AS max_end
          FROM time_table_routine
          WHERE starting_date IS NOT NULL
            AND ending_date IS NOT NULL
            AND timetable_structure_course_mapper_id IS NOT NULL
          GROUP BY timetable_structure_course_mapper_id
        ) r ON r.timetable_structure_course_mapper_id = m.timetable_structure_course_mapper_id
        SET
          m.starting_date = LEAST(m.starting_date, r.min_start),
          m.ending_date = GREATEST(m.ending_date, r.max_end),
          m.updated_at = CURRENT_TIMESTAMP
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
        'time_table_routine',
        'timetable_structure_course_mapper_id',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        { transaction },
      );

      const constraints = await queryInterface.getForeignKeyReferencesForTable('time_table_routine');
      let hasFk = false;
      for (const c of constraints) {
        if (c.constraintName === 'fk_routine_tts_course_mapper') {
          hasFk = true;
        }
      }
      if (!hasFk) {
        await queryInterface.addConstraint('time_table_routine', {
          fields: ['timetable_structure_course_mapper_id'],
          type: 'foreign key',
          name: 'fk_routine_tts_course_mapper',
          references: {
            table: 'time_table_structure_course',
            field: 'timetable_structure_course_mapper_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          transaction,
        });
      }

      const indexes = await queryInterface.showIndex('time_table_routine');
      let hasIdx = false;
      for (const index of indexes) {
        if (index.name === 'idx_routine_tts_course_mapper') {
          hasIdx = true;
        }
      }
      if (!hasIdx) {
        await queryInterface.addIndex(
          'time_table_routine',
          ['timetable_structure_course_mapper_id'],
          {
            name: 'idx_routine_tts_course_mapper',
            transaction,
          },
        );
      }

      // Drop direct structure link + soft-delete (was separate 151910)
      const routineFinal = await queryInterface.describeTable('time_table_routine');
      if (routineFinal.deleted_at) {
        await queryInterface.sequelize.query(
          `DELETE FROM time_table_routine WHERE deleted_at IS NOT NULL`,
          { transaction },
        );
        await queryInterface.removeColumn('time_table_routine', 'deleted_at', { transaction });
      }
      if (routineFinal.time_table_name_id) {
        await queryInterface.removeColumn('time_table_routine', 'time_table_name_id', {
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const routine = await queryInterface.describeTable('time_table_routine');

      if (!routine.time_table_name_id) {
        await queryInterface.addColumn(
          'time_table_routine',
          'time_table_name_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'time_table_structure',
              key: 'time_table_name_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          { transaction },
        );
        await queryInterface.sequelize.query(
          `
          UPDATE time_table_routine r
          INNER JOIN time_table_structure_course m
            ON m.timetable_structure_course_mapper_id = r.timetable_structure_course_mapper_id
          SET r.time_table_name_id = m.time_table_name_id
          `,
          { transaction },
        );
      }

      if (!routine.deleted_at) {
        await queryInterface.addColumn(
          'time_table_routine',
          'deleted_at',
          { type: Sequelize.DATE, allowNull: true },
          { transaction },
        );
      }

      await queryInterface.removeConstraint(
        'time_table_routine',
        'fk_routine_tts_course_mapper',
        { transaction },
      );
      await queryInterface.removeIndex(
        'time_table_routine',
        'idx_routine_tts_course_mapper',
        { transaction },
      );
      await queryInterface.removeColumn(
        'time_table_routine',
        'timetable_structure_course_mapper_id',
        { transaction },
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

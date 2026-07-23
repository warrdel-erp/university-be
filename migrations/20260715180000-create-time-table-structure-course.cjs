'use strict';

/**
 * 1/3 — Create mapper table + backfill from structure/routines.
 * Moves dates off structure. Keeps structure.course_id + session_id until 152000.
 *
 * Path A: normal + elective routines (session from term → class_sections_id → structure)
 * Path B: structures that still have course+session+dates but no routine yet
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tables = await queryInterface.showAllTables();
      const tableNames = tables.map((t) =>
        typeof t === 'string' ? t : t.tableName || t.name || Object.values(t)[0],
      );
      const hasMappingTable = tableNames.includes('time_table_structure_course');

      if (!hasMappingTable) {
        await queryInterface.createTable(
          'time_table_structure_course',
          {
            timetable_structure_course_mapper_id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            time_table_name_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'time_table_structure',
                key: 'time_table_name_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            course_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'course',
                key: 'course_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
            },
            university_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'university',
                key: 'university_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
            },
            institute_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'institute',
                key: 'institute_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
            },
            acedmic_year_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'acedmic_year',
                key: 'acedmic_year_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
            },
            session_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'session',
                key: 'session_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
            },
            starting_date: {
              type: Sequelize.DATEONLY,
              allowNull: false,
            },
            ending_date: {
              type: Sequelize.DATEONLY,
              allowNull: false,
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
              references: {
                model: 'users',
                key: 'user_id',
              },
            },
            updated_by: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'users',
                key: 'user_id',
              },
            },
          },
          { transaction },
        );

        await queryInterface.addIndex(
          'time_table_structure_course',
          ['time_table_name_id', 'course_id', 'session_id'],
          {
            unique: true,
            name: 'uniq_tts_course_session',
            transaction,
          },
        );
      }

      const structure = await queryInterface.describeTable('time_table_structure');
      const routine = await queryInterface.describeTable('time_table_routine');
      const hasStructureSession = Boolean(structure.session_id);
      const hasStructureCourse = Boolean(structure.course_id);
      const hasStructureDates = Boolean(structure.starting_date && structure.ending_date);
      const hasRoutineDeletedAt = Boolean(routine.deleted_at);
      const hasRoutineClassSectionsId = Boolean(routine.class_sections_id);
      const hasRoutineNameId = Boolean(routine.time_table_name_id);

      if (hasRoutineNameId) {
        const courseExpr = hasStructureCourse
          ? 'COALESCE(r.course_id, s.course_id)'
          : 'r.course_id';

        // Resolve session via JOIN (not correlated subquery) so ONLY_FULL_GROUP_BY
        // does not treat r.class_section_term_id as a non-grouped SELECT expression.
        const sessionJoin = `
          LEFT JOIN class_section_term cst
            ON cst.class_section_term_id = r.class_section_term_id
          LEFT JOIN class_sections cs_term
            ON cs_term.class_sections_id = cst.class_sections_id
          ${
            hasRoutineClassSectionsId
              ? `
          LEFT JOIN class_sections cs_routine
            ON cs_routine.class_sections_id = r.class_sections_id
          `
              : ''
          }
        `;

        const sessionExpr = hasStructureSession
          ? hasRoutineClassSectionsId
            ? 'COALESCE(cs_term.session_id, cs_routine.session_id, s.session_id)'
            : 'COALESCE(cs_term.session_id, s.session_id)'
          : hasRoutineClassSectionsId
            ? 'COALESCE(cs_term.session_id, cs_routine.session_id)'
            : 'cs_term.session_id';

        const startExpr = hasStructureDates
          ? 'COALESCE(s.starting_date, DATE(r.starting_date))'
          : 'DATE(r.starting_date)';
        const endExpr = hasStructureDates
          ? 'COALESCE(s.ending_date, DATE(r.ending_date))'
          : 'DATE(r.ending_date)';

        const deletedFilter = hasRoutineDeletedAt ? 'AND r.deleted_at IS NULL' : '';

        await queryInterface.sequelize.query(
          `
          INSERT INTO time_table_structure_course
            (
              time_table_name_id,
              course_id,
              university_id,
              institute_id,
              acedmic_year_id,
              session_id,
              starting_date,
              ending_date,
              created_at,
              updated_at,
              created_by,
              updated_by
            )
          SELECT
            s.time_table_name_id,
            ${courseExpr},
            s.university_id,
            s.institute_id,
            s.acedmic_year_id,
            ${sessionExpr},
            MIN(${startExpr}),
            MAX(${endExpr}),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            MIN(s.created_by),
            MIN(s.updated_by)
          FROM time_table_structure s
          INNER JOIN time_table_routine r
            ON r.time_table_name_id = s.time_table_name_id
           ${deletedFilter}
          ${sessionJoin}
          WHERE ${courseExpr} IS NOT NULL
            AND ${sessionExpr} IS NOT NULL
            AND ${startExpr} IS NOT NULL
            AND ${endExpr} IS NOT NULL
            AND NOT EXISTS (
              SELECT 1
              FROM time_table_structure_course m
              WHERE m.time_table_name_id = s.time_table_name_id
                AND m.course_id = ${courseExpr}
                AND m.session_id = ${sessionExpr}
            )
          GROUP BY
            s.time_table_name_id,
            ${courseExpr},
            s.university_id,
            s.institute_id,
            s.acedmic_year_id,
            ${sessionExpr}
          `,
          { transaction },
        );
      }

      if (hasStructureCourse && hasStructureSession && hasStructureDates) {
        await queryInterface.sequelize.query(
          `
          INSERT INTO time_table_structure_course
            (
              time_table_name_id,
              course_id,
              university_id,
              institute_id,
              acedmic_year_id,
              session_id,
              starting_date,
              ending_date,
              created_at,
              updated_at,
              created_by,
              updated_by
            )
          SELECT
            s.time_table_name_id,
            s.course_id,
            s.university_id,
            s.institute_id,
            s.acedmic_year_id,
            s.session_id,
            s.starting_date,
            s.ending_date,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            s.created_by,
            s.updated_by
          FROM time_table_structure s
          WHERE s.course_id IS NOT NULL
            AND s.session_id IS NOT NULL
            AND s.starting_date IS NOT NULL
            AND s.ending_date IS NOT NULL
            AND NOT EXISTS (
              SELECT 1
              FROM time_table_structure_course m
              WHERE m.time_table_name_id = s.time_table_name_id
                AND m.course_id = s.course_id
                AND m.session_id = s.session_id
            )
          `,
          { transaction },
        );
      }

      if (structure.starting_date) {
        await queryInterface.removeColumn('time_table_structure', 'starting_date', { transaction });
      }
      if (structure.ending_date) {
        await queryInterface.removeColumn('time_table_structure', 'ending_date', { transaction });
      }
      if (structure.deleted_at) {
        await queryInterface.sequelize.query(
          `DELETE FROM time_table_structure WHERE deleted_at IS NOT NULL`,
          { transaction },
        );
        await queryInterface.removeColumn('time_table_structure', 'deleted_at', { transaction });
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
      await queryInterface.addColumn(
        'time_table_structure',
        'starting_date',
        { type: Sequelize.DATEONLY, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'time_table_structure',
        'ending_date',
        { type: Sequelize.DATEONLY, allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'time_table_structure',
        'deleted_at',
        { type: Sequelize.DATE, allowNull: true },
        { transaction },
      );
      await queryInterface.dropTable('time_table_structure_course', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

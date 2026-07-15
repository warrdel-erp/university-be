'use strict';

/** Move structure dates onto course mapping; drop structure paranoid. */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tables = await queryInterface.showAllTables();
      const tableNames = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || Object.values(t)[0]));
      const hasMappingTable = tableNames.includes('time_table_structure_course');

      // MySQL DDL auto-commits; a previous failed run may leave an empty table behind.
      if (hasMappingTable) {
        await queryInterface.dropTable('time_table_structure_course', { transaction });
      }

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

      const structure = await queryInterface.describeTable('time_table_structure');
      const hasStructureSession = Boolean(structure.session_id);
      const hasStructureDates = Boolean(structure.starting_date && structure.ending_date);

      if (hasStructureDates) {
        const sessionExpr = hasStructureSession
          ? 'COALESCE(s.session_id, cs.session_id)'
          : 'cs.session_id';

        // Backfill only rows with a resolvable session_id (structure or class section).
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
            r.course_id,
            s.university_id,
            s.institute_id,
            s.acedmic_year_id,
            ${sessionExpr},
            s.starting_date,
            s.ending_date,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            s.created_by,
            s.updated_by
          FROM time_table_structure s
          INNER JOIN time_table_routine r
            ON r.time_table_name_id = s.time_table_name_id
           AND r.deleted_at IS NULL
          LEFT JOIN class_section_term cst
            ON cst.class_section_term_id = r.class_section_term_id
          LEFT JOIN class_sections cs
            ON cs.class_sections_id = cst.class_sections_id
          WHERE s.starting_date IS NOT NULL
            AND s.ending_date IS NOT NULL
            AND r.course_id IS NOT NULL
            AND ${sessionExpr} IS NOT NULL
          GROUP BY
            s.time_table_name_id,
            r.course_id,
            s.university_id,
            s.institute_id,
            s.acedmic_year_id,
            ${sessionExpr},
            s.starting_date,
            s.ending_date,
            s.created_by,
            s.updated_by
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

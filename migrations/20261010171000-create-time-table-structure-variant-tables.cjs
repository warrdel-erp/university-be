'use strict';

/**
 * Migration to create the 3 timetable structure variant tables:
 * 1. time_table_structure_variant
 * 2. time_table_structure_variant_periods
 * 3. time_table_structure_variant_course_mapping
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tables = await queryInterface.showAllTables();
      const tableNames = tables.map((t) =>
        typeof t === 'string' ? t : t.tableName || t.name || Object.values(t)[0],
      );

      // 1. Create time_table_structure_variant table
      if (!tableNames.includes('time_table_structure_variant')) {
        await queryInterface.createTable(
          'time_table_structure_variant',
          {
            time_table_structure_variant_id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            name: {
              type: Sequelize.STRING,
              allowNull: false,
            },
            time_table_structure_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'time_table_structure',
                key: 'time_table_name_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            is_default: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
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
            created_by: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'users',
                key: 'user_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
            },
            updated_by: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'users',
                key: 'user_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
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
          },
          { transaction },
        );

        await queryInterface.addIndex(
          'time_table_structure_variant',
          ['time_table_structure_id'],
          {
            name: 'idx_ttsv_structure_id',
            transaction,
          },
        );
      }

      // 2. Create time_table_structure_variant_periods table
      if (!tableNames.includes('time_table_structure_variant_periods')) {
        await queryInterface.createTable(
          'time_table_structure_variant_periods',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            time_table_structure_variant_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'time_table_structure_variant',
                key: 'time_table_structure_variant_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            time_table_structure_periods_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'time_table_structure_periods',
                key: 'time_table_creation_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            start_time: {
              type: Sequelize.STRING,
              allowNull: true,
            },
            end_time: {
              type: Sequelize.STRING,
              allowNull: true,
            },
            is_course: {
              type: Sequelize.BOOLEAN,
              allowNull: true,
              defaultValue: true,
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
            created_by: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'users',
                key: 'user_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
            },
            updated_by: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'users',
                key: 'user_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
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
          },
          { transaction },
        );

        await queryInterface.addIndex(
          'time_table_structure_variant_periods',
          ['time_table_structure_variant_id', 'time_table_structure_periods_id'],
          {
            name: 'uniq_variant_period',
            unique: true,
            transaction,
          },
        );
      }

      // 3. Create time_table_structure_variant_course_mapping table
      if (!tableNames.includes('time_table_structure_variant_course_mapping')) {
        await queryInterface.createTable(
          'time_table_structure_variant_course_mapping',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            timetable_structure_course_mapper_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'time_table_structure_course',
                key: 'timetable_structure_course_mapper_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            time_table_structure_variant_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'time_table_structure_variant',
                key: 'time_table_structure_variant_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            name: {
              type: Sequelize.STRING,
              allowNull: true,
            },
            starting_date: {
              type: Sequelize.DATEONLY,
              allowNull: false,
            },
            ending_date: {
              type: Sequelize.DATEONLY,
              allowNull: false,
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
            created_by: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'users',
                key: 'user_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
            },
            updated_by: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'users',
                key: 'user_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
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
          },
          { transaction },
        );

        await queryInterface.addIndex(
          'time_table_structure_variant_course_mapping',
          ['timetable_structure_course_mapper_id'],
          {
            name: 'idx_ttsvcm_mapper_id',
            transaction,
          },
        );

        await queryInterface.addIndex(
          'time_table_structure_variant_course_mapping',
          ['time_table_structure_variant_id'],
          {
            name: 'idx_ttsvcm_variant_id',
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
      await queryInterface.dropTable('time_table_structure_variant_course_mapping', { transaction });
      await queryInterface.dropTable('time_table_structure_variant_periods', { transaction });
      await queryInterface.dropTable('time_table_structure_variant', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

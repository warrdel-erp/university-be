'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) =>
      typeof t === 'string' ? t : t.tableName || t.name || Object.values(t)[0],
    );

    if (!tableNames.includes('time_table_cell')) {
      await queryInterface.createTable('time_table_cell', {
        time_table_cell_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        time_table_name_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'time_table_structure', key: 'time_table_name_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        time_table_routine_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'time_table_routine', key: 'time_table_routine_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        time_table_creation_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'time_table_structure_periods', key: 'time_table_creation_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        subject_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'subject', key: 'subject_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        elective_subject_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'elective_subject', key: 'elective_subject_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        teacher_subject_mapping_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'teacher_subject_mapping', key: 'teacher_subject_mapping_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        class_room_section_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'class_room_section', key: 'class_room_section_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        day: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        period: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        time_table_type: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'normal',
        },
        is_Attendence: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        is_same_teacher: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: true,
        },
        is_overriding_sybling_electives: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false,
        },
        combined_group_id: {
          type: Sequelize.STRING(36),
          allowNull: true,
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
          references: { model: 'users', key: 'user_id' },
        },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' },
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      });

      await queryInterface.addIndex('time_table_cell', ['time_table_routine_id'], {
        name: 'idx_time_table_cell_routine_id',
      });
      await queryInterface.addIndex('time_table_cell', ['time_table_creation_id', 'day'], {
        name: 'idx_time_table_cell_period_day',
      });
      await queryInterface.addIndex('time_table_cell', ['combined_group_id'], {
        name: 'idx_time_table_cell_combined_group_id',
      });
    }

    if (!tableNames.includes('time_table_cell_teachers')) {
      await queryInterface.createTable('time_table_cell_teachers', {
        time_table_cell_teacher_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        time_table_cell_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'time_table_cell', key: 'time_table_cell_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        teacher_type: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'Primary',
        },
        is_Attendence: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
          references: { model: 'users', key: 'user_id' },
        },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' },
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      });

      await queryInterface.addIndex('time_table_cell_teachers', ['time_table_cell_id'], {
        name: 'idx_time_table_cell_teachers_cell_id',
      });
      await queryInterface.addIndex('time_table_cell_teachers', ['user_id'], {
        name: 'idx_time_table_cell_teachers_user_id',
      });
    }

    if (!tableNames.includes('time_table_cell_date_wise')) {
      await queryInterface.createTable('time_table_cell_date_wise', {
        time_table_cell_date_wise_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        time_table_cell_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'time_table_cell', key: 'time_table_cell_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        class_room_section_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'class_room_section', key: 'class_room_section_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
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
          references: { model: 'users', key: 'user_id' },
        },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' },
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      });

      await queryInterface.addIndex(
        'time_table_cell_date_wise',
        ['time_table_cell_id', 'date'],
        {
          name: 'uq_time_table_cell_date_wise_cell_date',
          unique: true,
        },
      );
    }

    if (!tableNames.includes('time_table_cell_teachers_date_wise')) {
      await queryInterface.createTable('time_table_cell_teachers_date_wise', {
        time_table_cell_teachers_date_wise_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        time_table_cell_date_wise_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'time_table_cell_date_wise', key: 'time_table_cell_date_wise_id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        teacher_type: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'Primary',
        },
        is_Attendence: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
          references: { model: 'users', key: 'user_id' },
        },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' },
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      });

      await queryInterface.addIndex(
        'time_table_cell_teachers_date_wise',
        ['time_table_cell_date_wise_id'],
        { name: 'idx_time_table_cell_teachers_date_wise_date_id' },
      );
      await queryInterface.addIndex(
        'time_table_cell_teachers_date_wise',
        ['user_id'],
        { name: 'idx_time_table_cell_teachers_date_wise_user_id' },
      );
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) =>
      typeof t === 'string' ? t : t.tableName || t.name || Object.values(t)[0],
    );

    if (tableNames.includes('time_table_cell_teachers_date_wise')) {
      await queryInterface.dropTable('time_table_cell_teachers_date_wise');
    }
    if (tableNames.includes('time_table_cell_date_wise')) {
      await queryInterface.dropTable('time_table_cell_date_wise');
    }
    if (tableNames.includes('time_table_cell_teachers')) {
      await queryInterface.dropTable('time_table_cell_teachers');
    }
    if (tableNames.includes('time_table_cell')) {
      await queryInterface.dropTable('time_table_cell');
    }
  },
};

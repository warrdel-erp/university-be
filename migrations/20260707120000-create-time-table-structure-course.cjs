'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('time_table_structure_course', {
      time_table_structure_course_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
        onDelete: 'CASCADE',
      },
      university_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'university',
          key: 'university_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'institute',
          key: 'institute_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      acedmic_year_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'acedmic_year',
          key: 'acedmic_year_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });

    await queryInterface.addIndex('time_table_structure_course', ['time_table_name_id', 'course_id'], {
      unique: true,
      name: 'unique_time_table_structure_course',
    });

    const [structures] = await queryInterface.sequelize.query(
      `SELECT time_table_name_id, course_id, university_id, institute_id, acedmic_year_id, created_by, updated_by
       FROM time_table_structure
       WHERE course_id IS NOT NULL AND deleted_at IS NULL`,
    );

    for (const row of structures) {
      await queryInterface.bulkInsert('time_table_structure_course', [{
        time_table_name_id: row.time_table_name_id,
        course_id: row.course_id,
        university_id: row.university_id,
        institute_id: row.institute_id,
        acedmic_year_id: row.acedmic_year_id,
        created_by: row.created_by,
        updated_by: row.updated_by,
      }]);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('time_table_structure_course');
  },
};

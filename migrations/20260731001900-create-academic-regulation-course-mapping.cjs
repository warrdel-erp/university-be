'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables().then(tables => tables.includes('academic_regulation_course_mapping'));

    if (!tableExists) {
      await queryInterface.createTable('academic_regulation_course_mapping', {
        academic_regulation_course_mapping_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        academic_regulation_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'academic_regulation',
            key: 'academic_regulation_id',
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
        institute_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'institute',
            key: 'institute_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        university_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'university',
            key: 'university_id',
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
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      });
    }

    // Ensure course_id column on academic_regulation is nullable or can be safely ignored
    const regTableInfo = await queryInterface.describeTable('academic_regulation');
    if (regTableInfo.course_id) {
      await queryInterface.changeColumn('academic_regulation', 'course_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('academic_regulation_course_mapping');
  }
};

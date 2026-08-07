'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables().then(tables =>
      tables.includes('academic_regulation')
    );

    if (!tableExists) {
      await queryInterface.createTable('academic_regulation', {
        academic_regulation_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        regulation_code: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        regulation_name: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        description: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        course_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'course',
            key: 'course_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
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
        applicable_batch: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        effective_from: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        effective_until: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        grading_scheme_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
          references: {
            model: 'grading',
            key: 'grading_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        version: {
          type: Sequelize.DECIMAL(3, 1),
          allowNull: false,
          defaultValue: 1.0,
        },
        status: {
          type: Sequelize.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
          allowNull: false,
          defaultValue: 'DRAFT',
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('academic_regulation');
  }
};

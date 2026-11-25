'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('academic_regulation_assesment_scheme')
    );

    if (!tableExists) {
      await queryInterface.createTable('academic_regulation_assesment_scheme', {
        id: {
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
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        evaluation_pattern: {
          type: Sequelize.ENUM('INTERNAL_EXTERNAL', 'INTERNAL_ONLY', 'EXTERNAL_ONLY'),
          allowNull: false,
          defaultValue: 'INTERNAL_EXTERNAL',
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
        internal_weightage: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
        },
        external_weightage: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
        },
        maximum_internal_marks: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        maximum_external_marks: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        minimum_internal_marks: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        minimum_external_marks: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        minimum_overall_marks: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        minimum_overall_percentage: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
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
          allowNull: true,
          references: {
            model: 'users',
            key: 'user_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
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

      // Add index for fast lookup by academic_regulation_id
      await queryInterface.addIndex('academic_regulation_assesment_scheme', ['academic_regulation_id'], {
        name: 'idx_aras_academic_regulation_id',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('academic_regulation_assesment_scheme');
  }
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables().then(tables => tables.includes('academic_regulation_classification'));

    if (!tableExists) {
      await queryInterface.createTable('academic_regulation_classification', {
        academic_regulation_classification_id: {
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
        classification_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        minimum_cgpa: {
          type: Sequelize.DECIMAL(3, 2),
          allowNull: true,
        },
        minimum_percentage: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
        },
        sort_order: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 1,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('academic_regulation_classification');
  }
};

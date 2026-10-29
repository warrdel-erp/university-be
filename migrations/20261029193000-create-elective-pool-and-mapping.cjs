'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Create elective_pool table
      await queryInterface.createTable(
        'elective_pool',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          name: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },
          code: {
            type: Sequelize.STRING(50),
            allowNull: false,
            unique: true,
          },
          description: {
            type: Sequelize.STRING(300),
            allowNull: true,
          },
          scope: {
            type: Sequelize.ENUM('institute', 'programme', 'batch'),
            allowNull: false,
            defaultValue: 'programme',
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
          batch_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'batch',
              key: 'batch_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
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
            allowNull: true,
          },
          campus_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          created_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          updated_by: {
            type: Sequelize.INTEGER,
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
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
          },
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { transaction: t }
      );

      // 2. Create elective_pool_subject_mapping table
      await queryInterface.createTable(
        'elective_pool_subject_mapping',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          elective_pool_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'elective_pool',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          subject_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'subject',
              key: 'subject_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          created_by: {
            type: Sequelize.INTEGER,
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
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
          },
        },
        { transaction: t }
      );

      // 3. Add unique constraint on (elective_pool_id, subject_id)
      await queryInterface.addConstraint('elective_pool_subject_mapping', {
        fields: ['elective_pool_id', 'subject_id'],
        type: 'unique',
        name: 'unique_elective_pool_subject_mapping',
        transaction: t,
      });
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.dropTable('elective_pool_subject_mapping', { transaction: t });
      await queryInterface.dropTable('elective_pool', { transaction: t });
    });
  },
};


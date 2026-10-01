'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'previous_academic_upload_log',
        {
          previous_academic_upload_log_id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          curriculum_batch_term_mapping_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'curriculum_batch_term_mapping',
              key: 'curriculum_batch_term_mapping_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          session_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          file_name: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          mime_type: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          file_size: {
            type: Sequelize.BIGINT,
            allowNull: true,
          },
          file_data: {
            type: Sequelize.BLOB('long'),
            allowNull: true,
          },
          status: {
            type: Sequelize.ENUM('SUCCESS', 'FAILED'),
            allowNull: false,
          },
          error_message: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          entries_created: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          entries_updated: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
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
          created_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'user_id',
            },
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
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        'previous_academic_upload_log',
        ['curriculum_batch_term_mapping_id'],
        {
          name: 'idx_pa_upload_log_term_mapping',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'previous_academic_upload_log',
        ['university_id', 'institute_id'],
        {
          name: 'idx_pa_upload_log_tenant',
          transaction,
        }
      );

      await queryInterface.addIndex(
        'previous_academic_upload_log',
        ['status'],
        {
          name: 'idx_pa_upload_log_status',
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('previous_academic_upload_log', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

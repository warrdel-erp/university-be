'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.createTable('jobs', {
        job_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

        university_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'university', key: 'university_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },

        institute_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'institute', key: 'institute_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },

        job_title: { type: Sequelize.STRING, allowNull: false },

        job_setting_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'job_settings', key: 'job_setting_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },

        sub_account_id: { type: Sequelize.INTEGER, references: { model: 'sub_account', key: 'sub_account_id' } },

        course_id: { type: Sequelize.INTEGER, references: { model: 'course', key: 'course_id' } },

        subject_id: { type: Sequelize.INTEGER, references: { model: 'subject', key: 'subject_id' } },

        employee_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employee', key: 'employee_id' }
        },

        allow_swap: { type: Sequelize.BOOLEAN, defaultValue: false },

        job_date: { type: Sequelize.DATEONLY, allowNull: false },
        start_time: { type: Sequelize.STRING, allowNull: false },
        end_time: { type: Sequelize.STRING, allowNull: false },

        recurrence: { type: Sequelize.STRING },
        location: { type: Sequelize.STRING },
        priority: { type: Sequelize.STRING },
        notes: { type: Sequelize.TEXT },

        status: { type: Sequelize.STRING, defaultValue: 'Active' },

        created_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' }
        },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' }
        },

        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      }, { transaction: t });

      await queryInterface.addIndex('jobs', ['job_date'], { transaction: t });
      await queryInterface.addIndex('jobs', ['employee_id'], { transaction: t });
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeIndex('jobs', ['job_date'], { transaction: t }).catch(()=>{});
      await queryInterface.removeIndex('jobs', ['employee_id'], { transaction: t }).catch(()=>{});
      await queryInterface.dropTable('jobs', { transaction: t });
    });
  }
};
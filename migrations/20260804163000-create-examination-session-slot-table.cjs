'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const slotTableExists = await queryInterface.showAllTables().then(tables => tables.includes('examination_session_slot'));
    if (!slotTableExists) {
      await queryInterface.createTable('examination_session_slot', {
        examination_session_slot_id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        examination_session_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: {
            model: 'examination_session',
            key: 'examination_session_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        slot_number: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        start_time: {
          type: Sequelize.TIME,
          allowNull: true,
        },
        end_time: {
          type: Sequelize.TIME,
          allowNull: true,
        },
        duration_minutes: {
          type: Sequelize.INTEGER,
          allowNull: true,
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

    const examScheduleDescription = await queryInterface.describeTable('exam_schedule').catch(() => ({}));
    if (examScheduleDescription && !examScheduleDescription.examination_session_slot_id) {
      await queryInterface.addColumn('exam_schedule', 'examination_session_slot_id', {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'examination_session_slot',
          key: 'examination_session_slot_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const examScheduleDescription = await queryInterface.describeTable('exam_schedule').catch(() => ({}));
    if (examScheduleDescription && examScheduleDescription.examination_session_slot_id) {
      await queryInterface.removeColumn('exam_schedule', 'examination_session_slot_id');
    }

    const slotTableExists = await queryInterface.showAllTables().then(tables => tables.includes('examination_session_slot'));
    if (slotTableExists) {
      await queryInterface.dropTable('examination_session_slot');
    }
  }
};

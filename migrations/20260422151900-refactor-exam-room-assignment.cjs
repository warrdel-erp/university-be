'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Remove redundant column and its FK from exam_schedule FIRST
      // This breaks the constraint that prevents dropping the room capacity tables.
      const scheduleTable = await queryInterface.describeTable('exam_schedule');
      if (scheduleTable.exam_room_capacity_id) {
        await queryInterface.removeColumn('exam_schedule', 'exam_room_capacity_id', { transaction });
      }

      // 2. Clear old table data and drop them to ensure a clean slate
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS exam_room_capacity', { transaction });
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS exam_schedule_room_capacity', { transaction });

      // 3. Create the new exam_schedule_room_capacity table from scratch
      await queryInterface.createTable('exam_schedule_room_capacity', {
        exam_schedule_room_capacity_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        exam_schedule_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'exam_schedule',
            key: 'exam_schedule_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        class_room_section_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'class_room_section',
            key: 'class_room_section_id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        capacity: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        columns: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'user_id'
          }
        },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'user_id'
          }
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('exam_schedule_room_capacity', { transaction });
      
      const scheduleTable = await queryInterface.describeTable('exam_schedule');
      if (!scheduleTable.exam_room_capacity_id) {
        await queryInterface.addColumn('exam_schedule', 'exam_room_capacity_id', {
          type: Sequelize.INTEGER,
          allowNull: true
        }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

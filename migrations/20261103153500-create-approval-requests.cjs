'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const rawTables = await queryInterface.showAllTables({ transaction: t });
      const tables = rawTables.map((tbl) => (typeof tbl === 'string' ? tbl : tbl.tableName || tbl.name || String(tbl)));

      if (!tables.includes('approval_requests')) {
        await queryInterface.createTable(
          'approval_requests',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            approval_for: {
              type: Sequelize.STRING(50),
              allowNull: false,
              comment: "Target entity type, e.g. 'leave', 'question_bank', 'examination'",
            },
            resource_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              comment: 'Primary key of the target entity',
            },
            requested_by: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'users',
                key: 'user_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            assigned_to_position_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'department_positions',
                key: 'department_position_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
            },
            level: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 1,
            },
            status: {
              type: Sequelize.ENUM('pending', 'approved', 'rejected', 'skipped', 'cancelled'),
              allowNull: false,
              defaultValue: 'pending',
            },
            approved_by_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'users',
                key: 'user_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            skipped_by_user_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'users',
                key: 'user_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            action_at: {
              type: Sequelize.DATE,
              allowNull: true,
            },
            description: {
              type: Sequelize.TEXT,
              allowNull: true,
            },
            university_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'university',
                key: 'university_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            institute_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'institute',
                key: 'institute_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            campus_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'campus',
                key: 'campus_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            department_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'department',
                key: 'department_id',
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
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
            deleted_at: {
              type: Sequelize.DATE,
              allowNull: true,
            },
          },
          { transaction: t }
        );

        // Add performance indexes
        await queryInterface.addIndex(
          'approval_requests',
          ['approval_for', 'resource_id'],
          {
            name: 'idx_ar_entity_resource',
            transaction: t,
          }
        );

        await queryInterface.addIndex(
          'approval_requests',
          ['assigned_to_position_id', 'status'],
          {
            name: 'idx_ar_position_status',
            transaction: t,
          }
        );

        await queryInterface.addIndex(
          'approval_requests',
          ['requested_by'],
          {
            name: 'idx_ar_requested_by',
            transaction: t,
          }
        );
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.dropTable('approval_requests', { transaction: t });
    });
  },
};


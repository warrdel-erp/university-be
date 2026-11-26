'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const rawTables = await queryInterface.showAllTables({ transaction: t });
      const tables = rawTables.map((tbl) =>
        typeof tbl === 'string' ? tbl : tbl.tableName || tbl.name || String(tbl)
      );

      // 1. Tab 1: attendance_policies (Main Master Table)
      if (!tables.includes('attendance_policies')) {
        await queryInterface.createTable(
          'attendance_policies',
          {
            policy_id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
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
            policy_name: {
              type: Sequelize.STRING(150),
              allowNull: false,
            },
            policy_code: {
              type: Sequelize.STRING(50),
              allowNull: true,
            },
            description: {
              type: Sequelize.TEXT,
              allowNull: true,
            },
            version_number: {
              type: Sequelize.STRING(20),
              allowNull: false,
              defaultValue: 'v1.0',
            },
            status: {
              type: Sequelize.ENUM('Draft', 'Active', 'Scheduled', 'Archived'),
              allowNull: false,
              defaultValue: 'Draft',
            },
            effective_from: {
              type: Sequelize.DATEONLY,
              allowNull: true,
            },
            effective_to: {
              type: Sequelize.DATEONLY,
              allowNull: true,
            },
            applicable_schedule: {
              type: Sequelize.STRING(100),
              allowNull: true,
              defaultValue: 'General Shift',
            },
            is_active: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
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
          },
          { transaction: t }
        );

        await queryInterface.addIndex('attendance_policies', ['university_id', 'institute_id'], {
          name: 'idx_attendance_policies_univ_inst',
          transaction: t,
        });
        await queryInterface.addIndex('attendance_policies', ['status'], {
          name: 'idx_attendance_policies_status',
          transaction: t,
        });
      }

      // 2. Tab 1: attendance_policy_mappings (Applicability)
      if (!tables.includes('attendance_policy_mappings')) {
        await queryInterface.createTable(
          'attendance_policy_mappings',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            policy_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'attendance_policies',
                key: 'policy_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            role_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'role',
                key: 'role_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            department_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'department',
                key: 'department_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            employee_id: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'employee',
                key: 'employee_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            is_active: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
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
          { transaction: t }
        );

        await queryInterface.addIndex('attendance_policy_mappings', ['policy_id'], {
          name: 'idx_apm_policy_id',
          transaction: t,
        });
        await queryInterface.addIndex('attendance_policy_mappings', ['role_id'], {
          name: 'idx_apm_role_id',
          transaction: t,
        });
      }

      // 3. Tab 2: attendance_policy_working_hours (Classification, Missing Punch, OD, Regularisation)
      if (!tables.includes('attendance_policy_working_hours')) {
        await queryInterface.createTable(
          'attendance_policy_working_hours',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            policy_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              unique: true,
              references: {
                model: 'attendance_policies',
                key: 'policy_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            min_full_day_minutes: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 450,
            },
            min_half_day_minutes: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 240,
            },
            consider_break_time: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            missing_punch_action: {
              type: Sequelize.ENUM('PENDING_REVIEW', 'TREAT_AS_ABSENT'),
              allowNull: false,
              defaultValue: 'PENDING_REVIEW',
            },
            auto_mark_absent_after_days: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: 3,
            },
            count_full_day_od_as_present: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            count_half_day_od_as_present: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            require_od_approval: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            allow_regularisation: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            regularisation_window_days: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: 7,
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
          { transaction: t }
        );
      }

      // 4. Tab 3: attendance_policy_late_early_rules (Late, Early, Strategy, Excessive, Safeguard)
      if (!tables.includes('attendance_policy_late_early_rules')) {
        await queryInterface.createTable(
          'attendance_policy_late_early_rules',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            policy_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              unique: true,
              references: {
                model: 'attendance_policies',
                key: 'policy_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            enable_late_entry: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            late_grace_period_minutes: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 10,
            },
            late_count_cycle: {
              type: Sequelize.ENUM('CALENDAR_MONTH', 'PAY_CYCLE', 'WEEKLY'),
              allowNull: false,
              defaultValue: 'CALENDAR_MONTH',
            },
            enable_early_exit: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            early_grace_period_minutes: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 10,
            },
            early_count_cycle: {
              type: Sequelize.ENUM('CALENDAR_MONTH', 'PAY_CYCLE', 'WEEKLY'),
              allowNull: false,
              defaultValue: 'CALENDAR_MONTH',
            },
            violation_counting_type: {
              type: Sequelize.ENUM('SEPARATE', 'COMBINED'),
              allowNull: false,
              defaultValue: 'SEPARATE',
            },
            enable_excessive_violation: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            excessive_late_threshold_min: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: 120,
            },
            excessive_late_penalty: {
              type: Sequelize.ENUM('NO_IMPACT', 'HALF_DAY', 'FULL_DAY', 'LOP'),
              allowNull: true,
              defaultValue: 'HALF_DAY',
            },
            excessive_early_threshold_min: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: 120,
            },
            excessive_early_penalty: {
              type: Sequelize.ENUM('NO_IMPACT', 'HALF_DAY', 'FULL_DAY', 'LOP'),
              allowNull: true,
              defaultValue: 'HALF_DAY',
            },
            exclude_approved_exceptions: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            max_daily_penalty_days: {
              type: Sequelize.DECIMAL(3, 2),
              allowNull: false,
              defaultValue: 1.00,
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
          { transaction: t }
        );
      }

      // 5. Tab 3: attendance_policy_penalty_slabs (Repeated Violation Tiers)
      if (!tables.includes('attendance_policy_penalty_slabs')) {
        await queryInterface.createTable(
          'attendance_policy_penalty_slabs',
          {
            slab_id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            policy_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'attendance_policies',
                key: 'policy_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            violation_type: {
              type: Sequelize.ENUM('LATE_ENTRY', 'EARLY_EXIT', 'COMBINED'),
              allowNull: false,
            },
            from_occurrence: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            to_occurrence: {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            attendance_impact: {
              type: Sequelize.ENUM('NO_IMPACT', 'HALF_DAY', 'FULL_DAY', 'LOP'),
              allowNull: false,
              defaultValue: 'NO_IMPACT',
            },
            penalty_application: {
              type: Sequelize.ENUM('AT_THRESHOLD', 'EVERY_OCCURRENCE'),
              allowNull: false,
              defaultValue: 'AT_THRESHOLD',
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
          { transaction: t }
        );

        await queryInterface.addIndex('attendance_policy_penalty_slabs', ['policy_id', 'violation_type'], {
          name: 'idx_apps_policy_violation',
          transaction: t,
        });
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.dropTable('attendance_policy_penalty_slabs', { transaction: t });
      await queryInterface.dropTable('attendance_policy_late_early_rules', { transaction: t });
      await queryInterface.dropTable('attendance_policy_working_hours', { transaction: t });
      await queryInterface.dropTable('attendance_policy_mappings', { transaction: t });
      await queryInterface.dropTable('attendance_policies', { transaction: t });
    });
  },
};

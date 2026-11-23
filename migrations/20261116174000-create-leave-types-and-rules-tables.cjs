'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const rawTables = await queryInterface.showAllTables({ transaction: t });
      const tables = rawTables.map((tbl) =>
        typeof tbl === 'string' ? tbl : tbl.tableName || tbl.name || String(tbl)
      );

      // 1. Create leave_types table (Main master table with Multi-tenancy)
      if (!tables.includes('leave_types')) {
        await queryInterface.createTable(
          'leave_types',
          {
            id: {
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
            name: {
              type: Sequelize.STRING(100),
              allowNull: false,
            },
            code: {
              type: Sequelize.STRING(20),
              allowNull: false,
            },
            description: {
              type: Sequelize.TEXT,
              allowNull: true,
            },
            classification: {
              type: Sequelize.ENUM('Paid', 'Unpaid', 'Duty'),
              allowNull: false,
              defaultValue: 'Paid',
            },
            track_balance: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            status: {
              type: Sequelize.ENUM('Active', 'Inactive', 'Draft', 'Published'),
              allowNull: false,
              defaultValue: 'Active',
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
            updated_by: {
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
          { transaction: t }
        );

        // Composite unique index for multi-tenancy: university_id + code
        await queryInterface.addIndex('leave_types', ['university_id', 'code'], {
          name: 'uk_leave_types_university_code',
          unique: true,
          transaction: t,
        });
      }

      // 2. Create leave_type_eligibility table (1:1 with leave_types)
      if (!tables.includes('leave_type_eligibility')) {
        await queryInterface.createTable(
          'leave_type_eligibility',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            leave_type_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              unique: true,
              references: {
                model: 'leave_types',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            allow_during_probation: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            min_service_requirement: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            allow_half_day: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            min_leave_duration: {
              type: Sequelize.DECIMAL(3, 1),
              allowNull: false,
              defaultValue: 0.5,
            },
            max_consecutive_days: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 5,
            },
            max_days_per_application: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 5,
            },
            advance_notice_min: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 1,
            },
            backdated_application: {
              type: Sequelize.STRING(50),
              allowNull: true,
              defaultValue: 'Allowed with Limit',
            },
            backdated_limit: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 3,
            },
            future_application_limit: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 60,
            },
            require_supporting_doc: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            doc_requirement_rule: {
              type: Sequelize.STRING(50),
              allowNull: true,
            },
            doc_required_after_days: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 2,
            },
            accepted_doc_types: {
              type: Sequelize.TEXT,
              allowNull: true,
            },
            combination_rule: {
              type: Sequelize.STRING(50),
              allowNull: false,
              defaultValue: 'No Restriction',
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

      // 3. Create leave_type_holidays_carry_forward table (1:1 with leave_types)
      if (!tables.includes('leave_type_holidays_carry_forward')) {
        await queryInterface.createTable(
          'leave_type_holidays_carry_forward',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            leave_type_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              unique: true,
              references: {
                model: 'leave_types',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            apply_sandwich_rule: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            sandwich_weekly_offs: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            sandwich_public_holidays: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            unused_leave_action: {
              type: Sequelize.STRING(50),
              allowNull: true,
              defaultValue: 'Carry to Next Period',
            },
            allow_year_end_carry_forward: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            carry_forward_calc_type: {
              type: Sequelize.STRING(50),
              allowNull: true,
              defaultValue: 'Percentage of Unused Balance',
            },
            carry_forward_percentage: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 50,
            },
            transfer_cap: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 30,
            },
            max_accumulated_balance: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 60,
            },
            expiry_after_months: {
              type: Sequelize.STRING(50),
              allowNull: true,
              defaultValue: 'After 12 months',
            },
            allow_negative_balance: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            max_negative_balance: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 0,
            },
            require_additional_approval: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
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

      // 4. Create leave_type_encashment table (1:1 with leave_types)
      if (!tables.includes('leave_type_encashment')) {
        await queryInterface.createTable(
          'leave_type_encashment',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            leave_type_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              unique: true,
              references: {
                model: 'leave_types',
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            allow_encashment: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            applicable_on: {
              type: Sequelize.STRING(50),
              allowNull: true,
            },
            ds_limit_method: {
              type: Sequelize.STRING(50),
              allowNull: true,
            },
            ds_max_encashment_days: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 10,
            },
            ds_min_balance_to_retain: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 10,
            },
            ds_min_service_requirement: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 12,
            },
            ds_encashment_frequency: {
              type: Sequelize.STRING(50),
              allowNull: true,
              defaultValue: 'Yearly',
            },
            sep_limit_method: {
              type: Sequelize.STRING(50),
              allowNull: true,
            },
            sep_min_service_requirement: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 0,
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
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.dropTable('leave_type_encashment', { transaction: t });
      await queryInterface.dropTable('leave_type_holidays_carry_forward', { transaction: t });
      await queryInterface.dropTable('leave_type_eligibility', { transaction: t });
      await queryInterface.dropTable('leave_types', { transaction: t });
    });
  },
};

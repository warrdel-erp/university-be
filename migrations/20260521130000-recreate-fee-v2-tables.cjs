'use strict';

/**
 * Drops and recreates all fee v2 tables with correct columns, FKs, and indexes.
 * Use when schema drifted (e.g. Unknown column 'student_fee_invoice_id').
 * WARNING: Deletes all data in these tables.
 */

const DROP_ORDER = [
  'student_fee_payment',
  'student_invoice_additional_fee',
  'student_fee_invoice',
  'additional_fee',
  'fee_plan_item',
  'fee_plan_profile',
  'fee_type_catalog',
  'fee_type_categories',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of DROP_ORDER) {
      await queryInterface.dropTable(table, { force: true }).catch(() => {});
    }

    await queryInterface.createTable('fee_type_categories', {
      fee_type_category_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'institute', key: 'institute_id' },
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
    });

    await queryInterface.createTable('fee_type_catalog', {
      fee_type_catalog_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      fee_type_category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'fee_type_categories', key: 'fee_type_category_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'institute', key: 'institute_id' },
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
    });

    await queryInterface.createTable('fee_plan_profile', {
      fee_plan_profile_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      plan_type: {
        type: Sequelize.ENUM('annual', 'semester', 'trimester'),
        allowNull: false,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      course_session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'session_course_mapping', key: 'session_course_mapping_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'institute', key: 'institute_id' },
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
    });

    await queryInterface.createTable('fee_plan_item', {
      fee_plan_item_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      create_date: { type: Sequelize.DATEONLY, allowNull: false },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      term_name: { type: Sequelize.STRING, allowNull: true },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      fee_plan_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'fee_plan_profile', key: 'fee_plan_profile_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'institute', key: 'institute_id' },
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
    });

    await queryInterface.createTable('additional_fee', {
      additional_fee_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      fee_type_catalog_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'fee_type_catalog', key: 'fee_type_catalog_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      fee_plan_item_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'fee_plan_item', key: 'fee_plan_item_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'institute', key: 'institute_id' },
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
    });

    await queryInterface.createTable('student_fee_invoice', {
      student_fee_invoice_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      create_date: { type: Sequelize.DATEONLY, allowNull: false },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      total: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      status: {
        type: Sequelize.ENUM('non_generated', 'generated'),
        allowNull: false,
        defaultValue: 'non_generated',
      },
      payment_status: {
        type: Sequelize.ENUM('unpaid', 'partial', 'paid'),
        allowNull: false,
        defaultValue: 'unpaid',
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'students', key: 'student_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      fee_plan_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'fee_plan_item', key: 'fee_plan_item_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'institute', key: 'institute_id' },
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
    });

    await queryInterface.createTable('student_invoice_additional_fee', {
      student_invoice_additional_fee_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      student_fee_invoice_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'student_fee_invoice', key: 'student_fee_invoice_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      waiver: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      additional_fee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'additional_fee', key: 'additional_fee_id' },
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
    });

    await queryInterface.createTable('student_fee_payment', {
      student_fee_payment_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      student_fee_invoice_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'student_fee_invoice', key: 'student_fee_invoice_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'institute', key: 'institute_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      paid_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      payment_date: { type: Sequelize.DATEONLY, allowNull: false },
      payment_method: { type: Sequelize.STRING(100), allowNull: false },
      reference_number: { type: Sequelize.STRING(150), allowNull: true },
      notes: { type: Sequelize.STRING(500), allowNull: true },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
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
    });

    await queryInterface.addIndex('student_fee_payment', ['student_fee_invoice_id'], {
      name: 'idx_student_fee_payment_invoice',
    });

    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  },

  async down() {
    // Not reversed — use recreate migration or manual restore from backup.
  },
};

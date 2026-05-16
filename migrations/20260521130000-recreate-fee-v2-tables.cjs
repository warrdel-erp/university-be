'use strict';

/**
 * Fix fee v2 table schemas only — does NOT drop tables or delete data.
 * Adds missing tables/columns, renames legacy PK columns when needed.
 */

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tableName`,
    { replacements: { tableName } }
  );
  return Number(rows[0].cnt) > 0;
}

async function columnExists(queryInterface, tableName, columnName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :tableName
       AND COLUMN_NAME = :columnName`,
    { replacements: { tableName, columnName } }
  );
  return Number(rows[0].cnt) > 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'fee_type_categories'))) {
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
    }

    if (!(await tableExists(queryInterface, 'fee_type_catalog'))) {
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
    }

    if (!(await tableExists(queryInterface, 'fee_plan_profile'))) {
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
    }

    if (!(await tableExists(queryInterface, 'fee_plan_item'))) {
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
    }

    if (!(await tableExists(queryInterface, 'additional_fee'))) {
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
    }

    if (!(await tableExists(queryInterface, 'student_fee_invoice'))) {
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
    } else {
      const hasPk = await columnExists(
        queryInterface,
        'student_fee_invoice',
        'student_fee_invoice_id'
      );
      const hasLegacyId = await columnExists(queryInterface, 'student_fee_invoice', 'id');

      if (!hasPk && hasLegacyId) {
        await queryInterface.sequelize.query(
          'ALTER TABLE `student_fee_invoice` CHANGE COLUMN `id` `student_fee_invoice_id` INT NOT NULL AUTO_INCREMENT'
        );
      }

      if (!(await columnExists(queryInterface, 'student_fee_invoice', 'payment_status'))) {
        await queryInterface.addColumn('student_fee_invoice', 'payment_status', {
          type: Sequelize.ENUM('unpaid', 'partial', 'paid'),
          allowNull: false,
          defaultValue: 'unpaid',
        });
      }
    }

    if (!(await tableExists(queryInterface, 'student_invoice_additional_fee'))) {
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
    } else if (
      !(await columnExists(
        queryInterface,
        'student_invoice_additional_fee',
        'student_fee_invoice_id'
      ))
    ) {
      await queryInterface.addColumn(
        'student_invoice_additional_fee',
        'student_fee_invoice_id',
        { type: Sequelize.INTEGER, allowNull: true }
      );
    }

    if (!(await tableExists(queryInterface, 'student_fee_payment'))) {
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
    } else if (
      !(await columnExists(queryInterface, 'student_fee_payment', 'student_fee_invoice_id'))
    ) {
      await queryInterface.addColumn('student_fee_payment', 'student_fee_invoice_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });

      const [indexes] = await queryInterface.sequelize.query(
        `SHOW INDEX FROM student_fee_payment WHERE Key_name = 'idx_student_fee_payment_invoice'`
      );
      if (indexes.length === 0) {
        await queryInterface.addIndex('student_fee_payment', ['student_fee_invoice_id'], {
          name: 'idx_student_fee_payment_invoice',
        });
      }
    }
  },

  async down() {
    // Non-destructive — no rollback.
  },
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || String(t)));

    if (!normalized.includes('grading')) {
      await queryInterface.createTable('grading', {
        grading_id: {
          type: Sequelize.BIGINT,
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
        grading_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        grading_code: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        grading_method: {
          type: Sequelize.ENUM('ABSOLUTE', 'RELATIVE'),
          allowNull: false,
        },
        description: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM('DRAFT', 'PUBLISHED'),
          defaultValue: 'DRAFT',
          allowNull: false,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false,
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
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
          allowNull: false,
        },
      });

      await queryInterface.addIndex('grading', ['university_id', 'grading_code'], {
        name: 'uk_grading_code',
        unique: true,
      });
    }

    if (!normalized.includes('grading_grade')) {
      await queryInterface.createTable('grading_grade', {
        grading_grade_id: {
          type: Sequelize.BIGINT,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        grading_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: {
            model: 'grading',
            key: 'grading_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        grade: {
          type: Sequelize.STRING(10),
          allowNull: false,
        },
        min_percentage: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
        },
        max_percentage: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
        },
        grade_point: {
          type: Sequelize.DECIMAL(4, 2),
          allowNull: false,
        },
        result_label: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        remarks: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        sort_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        is_pass: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
          allowNull: false,
        },
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('grading_grade');
    await queryInterface.dropTable('grading');
  },
};

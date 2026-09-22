'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
    // 1. Add course_id to session
    await queryInterface.addColumn('session', 'course_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'course',
        key: 'course_id',
      },
    }, { transaction: t });

    // 2. Make acedmic_year_id nullable in session
    await queryInterface.changeColumn('session', 'acedmic_year_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    }, { transaction: t });

    // 3. Add active_year to class_sections
    await queryInterface.addColumn('class_sections', 'active_year', {
      type: Sequelize.INTEGER,
      allowNull: true,
    }, { transaction: t });

    // 4. Create session_batch_mapping table
    await queryInterface.createTable('session_batch_mapping', {
      session_batch_mapping_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'session',
          key: 'session_id',
        },
        onDelete: 'CASCADE',
      },
      batch: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
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
    }, { transaction: t });

    // Add unique constraint on session_id and batch
    await queryInterface.addConstraint('session_batch_mapping', {
      fields: ['session_id', 'batch'],
      type: 'unique',
      name: 'unique_session_batch_mapping',
    }, { transaction: t });
      });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.dropTable('session_batch_mapping', { transaction: t });
    await queryInterface.removeColumn('class_sections', 'active_year', { transaction: t });
    await queryInterface.changeColumn('session', 'acedmic_year_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    }, { transaction: t });
    await queryInterface.removeColumn('session', 'course_id', { transaction: t });
      });
  }
};
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'governance_body',
      {
        governance_body_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        university_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'university', key: 'university_id' },
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
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        category: {
          type: Sequelize.ENUM(
            'Authority',
            'Board',
            'Committee',
            'Council',
            'Cell',
            'Task Force',
            'Working Group',
          ),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        parent_body_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'governance_body', key: 'governance_body_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        constituted_on: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        effective_from: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        effective_to: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM('Active', 'Inactive', 'Dissolved'),
          allowNull: false,
          defaultValue: 'Active',
        },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        updated_by: {
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
      },
      { charset: 'latin1', collate: 'latin1_swedish_ci' },
    );

    await queryInterface.addIndex('governance_body', ['institute_id', 'code'], {
      unique: true,
      name: 'unique_governance_body_code_per_institute',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('governance_body');
  },
};

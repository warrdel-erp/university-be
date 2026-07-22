'use strict';

/**
 * Creates org_position (organogram position on department_structure).
 * Idempotent: skips create if table already exists.
 */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || String(t)));
  return normalized.some((name) => name.toLowerCase() === tableName.toLowerCase());
}

async function indexExists(queryInterface, tableName, indexName) {
  const indexes = await queryInterface.showIndex(tableName);
  return indexes.some((idx) => idx.name === indexName);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'org_position'))) {
      await queryInterface.createTable(
        'org_position',
        {
          org_position_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          department_structure_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'department_structure', key: 'department_structure_id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          position_name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          position_code: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          employment_category: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          reports_to_org_position_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'org_position', key: 'org_position_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          reporting_type: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          is_vacant: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          sort_order: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          level: {
            type: Sequelize.INTEGER,
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
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { charset: 'latin1', collate: 'latin1_swedish_ci' },
      );
    }

    if (
      (await tableExists(queryInterface, 'org_position')) &&
      !(await indexExists(queryInterface, 'org_position', 'idx_org_position_structure_code'))
    ) {
      await queryInterface.addIndex('org_position', ['department_structure_id', 'position_code'], {
        name: 'idx_org_position_structure_code',
      });
    }

    if (
      (await tableExists(queryInterface, 'org_position')) &&
      !(await indexExists(queryInterface, 'org_position', 'idx_org_position_tenant'))
    ) {
      await queryInterface.addIndex('org_position', ['university_id', 'institute_id'], {
        name: 'idx_org_position_tenant',
      });
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'org_position')) {
      await queryInterface.dropTable('org_position');
    }
  },
};

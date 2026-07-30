'use strict';

/**
 * Creates academic_group (wizard step 2). Multiple groups may share one academic_group_scope_id.
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
    if (!(await tableExists(queryInterface, 'academic_group'))) {
      await queryInterface.createTable(
        'academic_group',
        {
          academic_group_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          academic_group_scope_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'academic_group_scope', key: 'academic_group_scope_id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          group_name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          group_code: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          capacity: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          publish_status: {
            type: Sequelize.ENUM('draft', 'published'),
            allowNull: false,
            defaultValue: 'draft',
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
          acedmic_year_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'acedmic_year', key: 'acedmic_year_id' },
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
      (await tableExists(queryInterface, 'academic_group')) &&
      !(await indexExists(queryInterface, 'academic_group', 'idx_academic_group_scope_id'))
    ) {
      await queryInterface.addIndex('academic_group', ['academic_group_scope_id'], {
        name: 'idx_academic_group_scope_id',
      });
    }

    if (
      (await tableExists(queryInterface, 'academic_group')) &&
      !(await indexExists(queryInterface, 'academic_group', 'idx_academic_group_tenant'))
    ) {
      await queryInterface.addIndex('academic_group', ['university_id', 'institute_id', 'acedmic_year_id'], {
        name: 'idx_academic_group_tenant',
      });
    }

    if (
      (await tableExists(queryInterface, 'academic_group')) &&
      !(await indexExists(queryInterface, 'academic_group', 'idx_academic_group_publish_status'))
    ) {
      await queryInterface.addIndex('academic_group', ['publish_status'], {
        name: 'idx_academic_group_publish_status',
      });
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'academic_group')) {
      await queryInterface.dropTable('academic_group');
    }
  },
};

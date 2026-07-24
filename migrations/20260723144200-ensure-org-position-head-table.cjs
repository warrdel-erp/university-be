'use strict';

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
    if (!(await tableExists(queryInterface, 'org_position_head'))) {
      await queryInterface.createTable(
        'org_position_head',
        {
          org_position_head_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          org_position_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'org_position', key: 'org_position_id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'user_id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          holder_type: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          status: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'ACTIVE',
          },
          joining_date: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          end_date: {
            type: Sequelize.DATEONLY,
            allowNull: true,
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
      (await tableExists(queryInterface, 'org_position_head')) &&
      !(await indexExists(queryInterface, 'org_position_head', 'idx_org_position_head_position_user'))
    ) {
      await queryInterface.addIndex('org_position_head', ['org_position_id', 'user_id'], {
        name: 'idx_org_position_head_position_user',
      });
    }

    if (
      (await tableExists(queryInterface, 'org_position_head')) &&
      !(await indexExists(queryInterface, 'org_position_head', 'idx_org_position_head_tenant'))
    ) {
      await queryInterface.addIndex('org_position_head', ['university_id', 'institute_id'], {
        name: 'idx_org_position_head_tenant',
      });
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'org_position_head')) {
      await queryInterface.dropTable('org_position_head');
    }
  },
};

'use strict';

/**
 * Creates academic_group_user (wizard step 3 — faculty + role).
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
    if (!(await tableExists(queryInterface, 'academic_group_user'))) {
      await queryInterface.createTable(
        'academic_group_user',
        {
          academic_group_user_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          academic_group_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'academic_group', key: 'academic_group_id' },
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
          role: {
            type: Sequelize.ENUM(
              'primary_faculty',
              'co_faculty',
              'supervisor',
              'mentor',
              'external_faculty',
              'evaluator',
            ),
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
      (await tableExists(queryInterface, 'academic_group_user')) &&
      !(await indexExists(queryInterface, 'academic_group_user', 'idx_academic_group_user_group_user'))
    ) {
      await queryInterface.addIndex('academic_group_user', ['academic_group_id', 'user_id'], {
        name: 'idx_academic_group_user_group_user',
      });
    }

    if (
      (await tableExists(queryInterface, 'academic_group_user')) &&
      !(await indexExists(queryInterface, 'academic_group_user', 'idx_academic_group_user_tenant'))
    ) {
      await queryInterface.addIndex('academic_group_user', ['university_id', 'institute_id', 'acedmic_year_id'], {
        name: 'idx_academic_group_user_tenant',
      });
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'academic_group_user')) {
      await queryInterface.dropTable('academic_group_user');
    }
  },
};

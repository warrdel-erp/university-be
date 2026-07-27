'use strict';

/**
 * Creates academic_group_scope (wizard step 1).
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
    if (!(await tableExists(queryInterface, 'academic_group_scope'))) {
      await queryInterface.createTable(
        'academic_group_scope',
        {
          academic_group_scope_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          group_type: {
            type: Sequelize.ENUM('teaching', 'activity'),
            allowNull: false,
          },
          title: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          selection_scope: {
            type: Sequelize.ENUM('program_specific', 'cross_program'),
            allowNull: false,
          },
          course_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'course', key: 'course_id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          session_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'session', key: 'session_id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          term: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          academic_context_type: {
            type: Sequelize.ENUM('course', 'activity', 'none'),
            allowNull: false,
            defaultValue: 'none',
          },
          context_subject_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'subject', key: 'subject_id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          activity_name: {
            type: Sequelize.STRING,
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
      (await tableExists(queryInterface, 'academic_group_scope')) &&
      !(await indexExists(queryInterface, 'academic_group_scope', 'idx_academic_group_scope_tenant'))
    ) {
      await queryInterface.addIndex('academic_group_scope', ['university_id', 'institute_id', 'acedmic_year_id'], {
        name: 'idx_academic_group_scope_tenant',
      });
    }

    if (
      (await tableExists(queryInterface, 'academic_group_scope')) &&
      !(await indexExists(queryInterface, 'academic_group_scope', 'idx_academic_group_scope_course_session'))
    ) {
      await queryInterface.addIndex('academic_group_scope', ['course_id', 'session_id', 'term'], {
        name: 'idx_academic_group_scope_course_session',
      });
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'academic_group_scope')) {
      await queryInterface.dropTable('academic_group_scope');
    }
  },
};

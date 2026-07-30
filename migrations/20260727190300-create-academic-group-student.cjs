'use strict';

/**
 * Creates academic_group_student (wizard step 4 — student members).
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
    if (!(await tableExists(queryInterface, 'academic_group_student'))) {
      await queryInterface.createTable(
        'academic_group_student',
        {
          academic_group_student_id: {
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
          student_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'students', key: 'student_id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
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
      (await tableExists(queryInterface, 'academic_group_student')) &&
      !(await indexExists(queryInterface, 'academic_group_student', 'idx_academic_group_student_group_student'))
    ) {
      await queryInterface.addIndex('academic_group_student', ['academic_group_id', 'student_id'], {
        name: 'idx_academic_group_student_group_student',
      });
    }

    if (
      (await tableExists(queryInterface, 'academic_group_student')) &&
      !(await indexExists(queryInterface, 'academic_group_student', 'idx_academic_group_student_tenant'))
    ) {
      await queryInterface.addIndex('academic_group_student', ['university_id', 'institute_id', 'acedmic_year_id'], {
        name: 'idx_academic_group_student_tenant',
      });
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'academic_group_student')) {
      await queryInterface.dropTable('academic_group_student');
    }
  },
};

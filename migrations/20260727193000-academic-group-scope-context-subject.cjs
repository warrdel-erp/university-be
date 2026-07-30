'use strict';

/**
 * Rename academic_group_scope.context_course_id → context_subject_id (FK to subject).
 */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || String(t)));
  return normalized.some((name) => name.toLowerCase() === tableName.toLowerCase());
}

async function columnExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName);
  return Object.keys(description).some((name) => name.toLowerCase() === columnName.toLowerCase());
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'academic_group_scope'))) {
      return;
    }

    if (await columnExists(queryInterface, 'academic_group_scope', 'context_course_id')) {
      await queryInterface.removeConstraint('academic_group_scope', 'academic_group_scope_ibfk_3').catch(() => {});
      // Try common Sequelize-generated FK names; ignore if missing
      const constraints = await queryInterface.getForeignKeyReferencesForTable('academic_group_scope');
      for (const constraint of constraints) {
        if (String(constraint.columnName).toLowerCase() === 'context_course_id') {
          await queryInterface.removeConstraint('academic_group_scope', constraint.constraintName);
        }
      }

      await queryInterface.renameColumn('academic_group_scope', 'context_course_id', 'context_subject_id');
    }

    if (await columnExists(queryInterface, 'academic_group_scope', 'context_subject_id')) {
      const constraints = await queryInterface.getForeignKeyReferencesForTable('academic_group_scope');
      let hasSubjectFk = false;
      for (const constraint of constraints) {
        if (String(constraint.columnName).toLowerCase() === 'context_subject_id') {
          hasSubjectFk = true;
        }
      }
      if (!hasSubjectFk) {
        await queryInterface.addConstraint('academic_group_scope', {
          fields: ['context_subject_id'],
          type: 'foreign key',
          name: 'fk_academic_group_scope_context_subject',
          references: {
            table: 'subject',
            field: 'subject_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        });
      }
    }
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, 'academic_group_scope'))) {
      return;
    }

    if (await columnExists(queryInterface, 'academic_group_scope', 'context_subject_id')) {
      const constraints = await queryInterface.getForeignKeyReferencesForTable('academic_group_scope');
      for (const constraint of constraints) {
        if (String(constraint.columnName).toLowerCase() === 'context_subject_id') {
          await queryInterface.removeConstraint('academic_group_scope', constraint.constraintName);
        }
      }

      await queryInterface.renameColumn('academic_group_scope', 'context_subject_id', 'context_course_id');

      await queryInterface.addConstraint('academic_group_scope', {
        fields: ['context_course_id'],
        type: 'foreign key',
        name: 'fk_academic_group_scope_context_course',
        references: {
          table: 'course',
          field: 'course_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }
  },
};

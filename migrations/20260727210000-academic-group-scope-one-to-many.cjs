'use strict';

/**
 * Allow multiple academic_group rows per academic_group_scope.
 * MySQL: unique index on academic_group_scope_id backs the FK — drop FK, drop unique, add non-unique index, restore FK.
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

async function findFkOnScopeId(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT CONSTRAINT_NAME AS name
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'academic_group'
      AND COLUMN_NAME = 'academic_group_scope_id'
      AND REFERENCED_TABLE_NAME = 'academic_group_scope'
  `);
  return rows.length ? (rows[0].name || rows[0].NAME) : null;
}

async function findUniqueOnScopeId(queryInterface) {
  const indexes = await queryInterface.showIndex('academic_group');
  for (const idx of indexes) {
    if (!idx.unique) {
      continue;
    }
    const fields = (idx.fields || []).map((f) => (typeof f === 'string' ? f : f.attribute || f.name));
    if (fields.length === 1 && fields[0] === 'academic_group_scope_id') {
      return idx.name;
    }
  }
  return null;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'academic_group'))) {
      return;
    }

    const fkName = await findFkOnScopeId(queryInterface);
    if (fkName) {
      await queryInterface.removeConstraint('academic_group', fkName);
    }

    const uniqueName = await findUniqueOnScopeId(queryInterface);
    if (uniqueName) {
      await queryInterface.removeIndex('academic_group', uniqueName);
    }

    if (!(await indexExists(queryInterface, 'academic_group', 'idx_academic_group_scope_id'))) {
      await queryInterface.addIndex('academic_group', ['academic_group_scope_id'], {
        name: 'idx_academic_group_scope_id',
      });
    }

    await queryInterface.addConstraint('academic_group', {
      fields: ['academic_group_scope_id'],
      type: 'foreign key',
      name: 'academic_group_ibfk_scope',
      references: {
        table: 'academic_group_scope',
        field: 'academic_group_scope_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },

  async down(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'academic_group'))) {
      return;
    }

    const fkName = await findFkOnScopeId(queryInterface);
    if (fkName) {
      await queryInterface.removeConstraint('academic_group', fkName);
    }

    if (await indexExists(queryInterface, 'academic_group', 'idx_academic_group_scope_id')) {
      await queryInterface.removeIndex('academic_group', 'idx_academic_group_scope_id');
    }

    await queryInterface.addIndex('academic_group', ['academic_group_scope_id'], {
      unique: true,
      name: 'academic_group_scope_id',
    });

    await queryInterface.addConstraint('academic_group', {
      fields: ['academic_group_scope_id'],
      type: 'foreign key',
      name: 'academic_group_ibfk_1',
      references: {
        table: 'academic_group_scope',
        field: 'academic_group_scope_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },
};

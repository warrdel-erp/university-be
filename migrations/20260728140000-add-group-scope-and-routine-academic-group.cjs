'use strict';

/**
 * Migration to add academic_group_scope_id to time_table_structure_course
 * and academic_group_id to time_table_routine, and allow course_id to be null in both tables.
 */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || String(t)));
  return normalized.some((name) => name.toLowerCase() === tableName.toLowerCase());
}

async function columnExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return Boolean(table[columnName]);
}

async function dropForeignKeyConstraints(queryInterface, tableName, columnName) {
  try {
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND COLUMN_NAME = '${columnName}'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const row of constraints) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``
      );
    }
  } catch (err) {
    console.warn(`Warning dropping FK for ${tableName}.${columnName}:`, err.message);
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. time_table_structure_course modifications
    if (await tableExists(queryInterface, 'time_table_structure_course')) {
      if (!(await columnExists(queryInterface, 'time_table_structure_course', 'academic_group_scope_id'))) {
        await queryInterface.addColumn('time_table_structure_course', 'academic_group_scope_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'academic_group_scope',
            key: 'academic_group_scope_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
      }

      await dropForeignKeyConstraints(queryInterface, 'time_table_structure_course', 'course_id');
      await queryInterface.sequelize.query('ALTER TABLE `time_table_structure_course` MODIFY `course_id` INT NULL');

      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE \`time_table_structure_course\`
          ADD CONSTRAINT \`fk_ttsc_course\`
          FOREIGN KEY (\`course_id\`) REFERENCES \`course\` (\`course_id\`)
          ON UPDATE CASCADE ON DELETE SET NULL
        `);
      } catch (err) {
        // FK constraint may already exist or table structure differs slightly
      }
    }

    // 2. time_table_routine modifications
    if (await tableExists(queryInterface, 'time_table_routine')) {
      if (!(await columnExists(queryInterface, 'time_table_routine', 'academic_group_id'))) {
        await queryInterface.addColumn('time_table_routine', 'academic_group_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'academic_group',
            key: 'academic_group_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
      }

      await dropForeignKeyConstraints(queryInterface, 'time_table_routine', 'course_id');
      await queryInterface.sequelize.query('ALTER TABLE `time_table_routine` MODIFY `course_id` INT NULL');

      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE \`time_table_routine\`
          ADD CONSTRAINT \`fk_ttr_course\`
          FOREIGN KEY (\`course_id\`) REFERENCES \`course\` (\`course_id\`)
          ON UPDATE CASCADE ON DELETE SET NULL
        `);
      } catch (err) {
        // FK constraint may already exist
      }
    }
  },

  async down(queryInterface, Sequelize) {
    if (await tableExists(queryInterface, 'time_table_structure_course')) {
      if (await columnExists(queryInterface, 'time_table_structure_course', 'academic_group_scope_id')) {
        await queryInterface.removeColumn('time_table_structure_course', 'academic_group_scope_id');
      }
      await dropForeignKeyConstraints(queryInterface, 'time_table_structure_course', 'course_id');
      await queryInterface.sequelize.query('ALTER TABLE `time_table_structure_course` MODIFY `course_id` INT NOT NULL');
    }

    if (await tableExists(queryInterface, 'time_table_routine')) {
      if (await columnExists(queryInterface, 'time_table_routine', 'academic_group_id')) {
        await queryInterface.removeColumn('time_table_routine', 'academic_group_id');
      }
      await dropForeignKeyConstraints(queryInterface, 'time_table_routine', 'course_id');
      await queryInterface.sequelize.query('ALTER TABLE `time_table_routine` MODIFY `course_id` INT NOT NULL');
    }
  },
};

'use strict';

/**
 * Cleans invalid department parent links and blocks self-parent at DB level.
 *
 * MySQL cannot use CHECK here:
 * - parent_department_id is in an FK with CASCADE / SET NULL
 * - department_id is AUTO_INCREMENT (CHECK cannot refer to it)
 *
 * So we clean bad rows and enforce with BEFORE INSERT / UPDATE triggers.
 */

const INSERT_TRIGGER = 'trg_department_no_self_parent_insert';
const UPDATE_TRIGGER = 'trg_department_no_self_parent_update';
const FK_NAME = 'fk_department_parent_department_id';

async function getParentForeignKeys(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'department'
      AND COLUMN_NAME = 'parent_department_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);
  return rows;
}

async function dropTriggerIfExists(queryInterface, triggerName) {
  await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS \`${triggerName}\``);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const table = await queryInterface.describeTable('department');
    if (!table.parent_department_id) {
      return;
    }

    await queryInterface.sequelize.query(`
      UPDATE department
      SET parent_department_id = NULL
      WHERE parent_department_id = department_id
    `);

    await queryInterface.sequelize.query(`
      UPDATE department child
      LEFT JOIN department parent
        ON parent.department_id = child.parent_department_id
      SET child.parent_department_id = NULL
      WHERE child.parent_department_id IS NOT NULL
        AND parent.department_id IS NULL
    `);

    // Restore FK if a previous failed migrate dropped it
    const foreignKeys = await getParentForeignKeys(queryInterface);
    if (foreignKeys.length === 0) {
      await queryInterface.addConstraint('department', {
        fields: ['parent_department_id'],
        type: 'foreign key',
        name: FK_NAME,
        references: {
          table: 'department',
          field: 'department_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    await dropTriggerIfExists(queryInterface, INSERT_TRIGGER);
    await dropTriggerIfExists(queryInterface, UPDATE_TRIGGER);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER \`${INSERT_TRIGGER}\`
      BEFORE INSERT ON department
      FOR EACH ROW
      BEGIN
        IF NEW.parent_department_id IS NOT NULL
           AND NEW.department_id IS NOT NULL
           AND NEW.parent_department_id = NEW.department_id THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Department cannot be its own parent';
        END IF;
      END
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER \`${UPDATE_TRIGGER}\`
      BEFORE UPDATE ON department
      FOR EACH ROW
      BEGIN
        IF NEW.parent_department_id IS NOT NULL
           AND NEW.parent_department_id = NEW.department_id THEN
          SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Department cannot be its own parent';
        END IF;
      END
    `);
  },

  async down(queryInterface) {
    await dropTriggerIfExists(queryInterface, INSERT_TRIGGER);
    await dropTriggerIfExists(queryInterface, UPDATE_TRIGGER);
  },
};

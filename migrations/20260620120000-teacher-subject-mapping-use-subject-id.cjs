'use strict';

/** Replace class_subject_mapper_id with subject_id on teacher_subject_mapping */

const TABLE = 'teacher_subject_mapping';
const OLD_COLUMN = 'class_subject_mapper_id';
const NEW_COLUMN = 'subject_id';

async function dropForeignKeysOnColumn(queryInterface, tableName, columnName) {
  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :tableName
       AND COLUMN_NAME = :columnName
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: { tableName, columnName } }
  );

  for (const { CONSTRAINT_NAME } of constraints) {
    await queryInterface.removeConstraint(tableName, CONSTRAINT_NAME);
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable(TABLE);
    const hasNewColumn = Boolean(tableDefinition[NEW_COLUMN]);
    const hasOldColumn = Boolean(tableDefinition[OLD_COLUMN]);

    if (hasNewColumn && !hasOldColumn) {
      return;
    }

    if (!hasNewColumn) {
      await queryInterface.addColumn(TABLE, NEW_COLUMN, {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (hasOldColumn) {
      await queryInterface.sequelize.query(`
        UPDATE ${TABLE} tsm
        INNER JOIN class_subject_mapper csm
          ON tsm.${OLD_COLUMN} = csm.class_subject_mapper_id
        SET tsm.${NEW_COLUMN} = csm.subject_id
        WHERE tsm.${NEW_COLUMN} IS NULL
      `);
    }

    await queryInterface.changeColumn(TABLE, NEW_COLUMN, {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'subject',
        key: 'subject_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    if (hasOldColumn) {
      await dropForeignKeysOnColumn(queryInterface, TABLE, OLD_COLUMN);
      await queryInterface.removeColumn(TABLE, OLD_COLUMN);
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable(TABLE);

    if (!tableDefinition[NEW_COLUMN]) {
      return;
    }

    if (!tableDefinition[OLD_COLUMN]) {
      await queryInterface.addColumn(TABLE, OLD_COLUMN, {
        type: Sequelize.INTEGER,
        allowNull: true,
      });

      await queryInterface.sequelize.query(`
        UPDATE ${TABLE} tsm
        INNER JOIN class_subject_mapper csm
          ON tsm.${NEW_COLUMN} = csm.subject_id
        SET tsm.${OLD_COLUMN} = csm.class_subject_mapper_id
        WHERE tsm.${OLD_COLUMN} IS NULL
      `);

      await queryInterface.changeColumn(TABLE, OLD_COLUMN, {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'class_subject_mapper',
          key: 'class_subject_mapper_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    await dropForeignKeysOnColumn(queryInterface, TABLE, NEW_COLUMN);
    await queryInterface.removeColumn(TABLE, NEW_COLUMN);
  },
};

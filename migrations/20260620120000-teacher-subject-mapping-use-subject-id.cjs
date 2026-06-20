'use strict';

const TABLE = 'teacher_subject_mapping';
const OLD_COLUMN = 'class_subject_mapper_id';
const NEW_COLUMN = 'subject_id';

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const table = await queryInterface.describeTable(tableName, { transaction });
  return Boolean(table[columnName]);
}

async function dropForeignKeysOnColumn(queryInterface, tableName, columnName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [tableName, columnName], transaction }
  );

  for (const { CONSTRAINT_NAME } of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${CONSTRAINT_NAME}\``,
      { transaction }
    );
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const hasNewColumn = await columnExists(queryInterface, TABLE, NEW_COLUMN, transaction);
      const hasOldColumn = await columnExists(queryInterface, TABLE, OLD_COLUMN, transaction);

      if (hasNewColumn && !hasOldColumn) {
        await transaction.commit();
        return;
      }

      if (!hasNewColumn) {
        await queryInterface.addColumn(
          TABLE,
          NEW_COLUMN,
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction }
        );
      }

      if (hasOldColumn) {
        await queryInterface.sequelize.query(
          `UPDATE ${TABLE} tsm
           INNER JOIN class_subject_mapper csm
             ON tsm.${OLD_COLUMN} = csm.class_subject_mapper_id
           SET tsm.${NEW_COLUMN} = csm.subject_id
           WHERE tsm.${NEW_COLUMN} IS NULL`,
          { transaction }
        );
      }

      await queryInterface.changeColumn(
        TABLE,
        NEW_COLUMN,
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        { transaction }
      );

      if (hasOldColumn) {
        await dropForeignKeysOnColumn(queryInterface, TABLE, OLD_COLUMN, transaction);
        await queryInterface.removeColumn(TABLE, OLD_COLUMN, { transaction });
      }

      await dropForeignKeysOnColumn(queryInterface, TABLE, NEW_COLUMN, transaction);
      await queryInterface.addConstraint(TABLE, {
        fields: [NEW_COLUMN],
        type: 'foreign key',
        name: 'fk_teacher_subject_mapping_subject',
        references: {
          table: 'subject',
          field: 'subject_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const hasOldColumn = await columnExists(queryInterface, TABLE, OLD_COLUMN, transaction);
      const hasNewColumn = await columnExists(queryInterface, TABLE, NEW_COLUMN, transaction);

      if (!hasNewColumn) {
        await transaction.commit();
        return;
      }

      if (!hasOldColumn) {
        await queryInterface.addColumn(
          TABLE,
          OLD_COLUMN,
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction }
        );

        await queryInterface.sequelize.query(
          `UPDATE ${TABLE} tsm
           INNER JOIN class_subject_mapper csm
             ON tsm.${NEW_COLUMN} = csm.subject_id
           SET tsm.${OLD_COLUMN} = csm.class_subject_mapper_id
           WHERE tsm.${OLD_COLUMN} IS NULL`,
          { transaction }
        );

        await queryInterface.changeColumn(
          TABLE,
          OLD_COLUMN,
          {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          { transaction }
        );

        await queryInterface.addConstraint(TABLE, {
          fields: [OLD_COLUMN],
          type: 'foreign key',
          name: 'fk_teacher_subject_mapping_class_subject_mapper',
          references: {
            table: 'class_subject_mapper',
            field: 'class_subject_mapper_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          transaction,
        });
      }

      await dropForeignKeysOnColumn(queryInterface, TABLE, NEW_COLUMN, transaction);
      await queryInterface.removeColumn(TABLE, NEW_COLUMN, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

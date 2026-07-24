'use strict';

async function tableExists(queryInterface, tableName, transaction) {
  const [tables] = await queryInterface.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [tableName], transaction },
  );
  return tables.length > 0;
}

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const [columns] = await queryInterface.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName], transaction },
  );
  return columns.length > 0;
}

async function getColumnDefinition(queryInterface, tableName, columnName, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COLUMN_TYPE, IS_NULLABLE, EXTRA
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName], transaction },
  );
  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  let definition = row.COLUMN_TYPE;
  if (row.IS_NULLABLE === 'NO') {
    definition += ' NOT NULL';
  }
  if (row.EXTRA.includes('auto_increment')) {
    definition += ' AUTO_INCREMENT';
  }
  return definition;
}

async function renameColumnInplace(queryInterface, tableName, oldName, newName, transaction) {
  const definition = await getColumnDefinition(queryInterface, tableName, oldName, transaction);
  if (!definition) {
    return;
  }

  await queryInterface.sequelize.query(
    `ALTER TABLE \`${tableName}\` CHANGE COLUMN \`${oldName}\` \`${newName}\` ${definition}, ALGORITHM=INPLACE`,
    { transaction },
  );
}

async function dropFksOnColumn(queryInterface, tableName, columnName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME AS constraintName
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [tableName, columnName], transaction },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }
}

async function constraintExists(queryInterface, tableName, constraintName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?`,
    { replacements: [tableName, constraintName], transaction },
  );
  return constraints.length > 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (!(await tableExists(queryInterface, 'user_department_positions', transaction))) {
        await transaction.commit();
        return;
      }

      if (!(await columnExists(queryInterface, 'user_department_positions', 'org_position_id', transaction))) {
        await transaction.commit();
        return;
      }

      await dropFksOnColumn(queryInterface, 'user_department_positions', 'org_position_id', transaction);

      await renameColumnInplace(
        queryInterface,
        'user_department_positions',
        'org_position_id',
        'department_position_id',
        transaction,
      );

      if (
        (await tableExists(queryInterface, 'department_positions', transaction)) &&
        (await columnExists(queryInterface, 'department_positions', 'department_position_id', transaction)) &&
        !(await constraintExists(
          queryInterface,
          'user_department_positions',
          'fk_user_department_positions_department_position_id',
          transaction,
        ))
      ) {
        await queryInterface.addConstraint('user_department_positions', {
          fields: ['department_position_id'],
          type: 'foreign key',
          name: 'fk_user_department_positions_department_position_id',
          references: {
            table: 'department_positions',
            field: 'department_position_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (!(await tableExists(queryInterface, 'user_department_positions', transaction))) {
        await transaction.commit();
        return;
      }

      if (!(await columnExists(queryInterface, 'user_department_positions', 'department_position_id', transaction))) {
        await transaction.commit();
        return;
      }

      if (
        await constraintExists(
          queryInterface,
          'user_department_positions',
          'fk_user_department_positions_department_position_id',
          transaction,
        )
      ) {
        await queryInterface.removeConstraint(
          'user_department_positions',
          'fk_user_department_positions_department_position_id',
          { transaction },
        );
      }

      await renameColumnInplace(
        queryInterface,
        'user_department_positions',
        'department_position_id',
        'org_position_id',
        transaction,
      );

      if (
        (await tableExists(queryInterface, 'department_positions', transaction)) &&
        (await columnExists(queryInterface, 'department_positions', 'department_position_id', transaction)) &&
        !(await constraintExists(
          queryInterface,
          'user_department_positions',
          'fk_org_position_head_department_position_id',
          transaction,
        ))
      ) {
        await queryInterface.addConstraint('user_department_positions', {
          fields: ['org_position_id'],
          type: 'foreign key',
          name: 'fk_org_position_head_department_position_id',
          references: {
            table: 'department_positions',
            field: 'department_position_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

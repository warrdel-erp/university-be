'use strict';

/**
 * Align evalutions / jobs / teacher_substitute with models: employee_id → user_id
 * teacher_substitute also: substitute_employee_id → substitute_user_id
 * Optional cleanup: drop leftover lesson.employee_id
 */

const SIMPLE_TABLES = ['evalutions', 'jobs'];

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const description = await queryInterface.describeTable(tableName, { transaction });
  return Boolean(description[columnName]);
}

async function tableExists(queryInterface, tableName, transaction) {
  const tables = await queryInterface.showAllTables({ transaction });
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || String(t)));
  return normalized.some((name) => name.toLowerCase() === tableName.toLowerCase());
}

async function dropFksOnColumn(queryInterface, tableName, columnName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: [tableName, columnName], transaction },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }
}

async function dropIndexIfExists(queryInterface, tableName, indexName, transaction) {
  const [indexes] = await queryInterface.sequelize.query(
    `
    SELECT INDEX_NAME AS indexName
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    LIMIT 1
    `,
    { replacements: [tableName, indexName], transaction },
  );

  if (indexes.length > 0) {
    await queryInterface.removeIndex(tableName, indexName, { transaction });
  }
}

async function migrateSimpleTable(queryInterface, Sequelize, tableName, transaction) {
  if (!(await tableExists(queryInterface, tableName, transaction))) {
    return;
  }

  const hasEmployeeId = await columnExists(queryInterface, tableName, 'employee_id', transaction);
  const hasUserId = await columnExists(queryInterface, tableName, 'user_id', transaction);

  if (!hasUserId) {
    await queryInterface.addColumn(
      tableName,
      'user_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      { transaction },
    );
  }

  if (hasEmployeeId) {
    await dropFksOnColumn(queryInterface, tableName, 'employee_id', transaction);

    await queryInterface.sequelize.query(
      `
      UPDATE \`${tableName}\` AS t
      INNER JOIN employee AS e
        ON e.employee_id = t.employee_id
      SET t.user_id = e.user_id
      WHERE t.employee_id IS NOT NULL
        AND (t.user_id IS NULL)
      `,
      { transaction },
    );

    await queryInterface.removeColumn(tableName, 'employee_id', { transaction });
  }
}

async function revertSimpleTable(queryInterface, Sequelize, tableName, transaction) {
  if (!(await tableExists(queryInterface, tableName, transaction))) {
    return;
  }

  const hasUserId = await columnExists(queryInterface, tableName, 'user_id', transaction);
  const hasEmployeeId = await columnExists(queryInterface, tableName, 'employee_id', transaction);

  if (!hasEmployeeId) {
    await queryInterface.addColumn(
      tableName,
      'employee_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'employee',
          key: 'employee_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      { transaction },
    );
  }

  if (hasUserId) {
    await dropFksOnColumn(queryInterface, tableName, 'user_id', transaction);

    await queryInterface.sequelize.query(
      `
      UPDATE \`${tableName}\` AS t
      INNER JOIN employee AS e
        ON e.user_id = t.user_id
      SET t.employee_id = e.employee_id
      WHERE t.user_id IS NOT NULL
        AND (t.employee_id IS NULL)
      `,
      { transaction },
    );

    await queryInterface.removeColumn(tableName, 'user_id', { transaction });
  }
}

async function migrateTeacherSubstitute(queryInterface, Sequelize, transaction) {
  const tableName = 'teacher_substitute';
  if (!(await tableExists(queryInterface, tableName, transaction))) {
    return;
  }

  const hasEmployeeId = await columnExists(queryInterface, tableName, 'employee_id', transaction);
  const hasSubstituteEmployeeId = await columnExists(
    queryInterface,
    tableName,
    'substitute_employee_id',
    transaction,
  );
  const hasUserId = await columnExists(queryInterface, tableName, 'user_id', transaction);
  const hasSubstituteUserId = await columnExists(
    queryInterface,
    tableName,
    'substitute_user_id',
    transaction,
  );

  if (!hasUserId) {
    await queryInterface.addColumn(
      tableName,
      'user_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      { transaction },
    );
  }

  if (!hasSubstituteUserId) {
    await queryInterface.addColumn(
      tableName,
      'substitute_user_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      { transaction },
    );
  }

  if (hasEmployeeId) {
    await dropFksOnColumn(queryInterface, tableName, 'employee_id', transaction);

    await queryInterface.sequelize.query(
      `
      UPDATE \`${tableName}\` AS t
      INNER JOIN employee AS e
        ON e.employee_id = t.employee_id
      SET t.user_id = e.user_id
      WHERE t.employee_id IS NOT NULL
        AND (t.user_id IS NULL)
      `,
      { transaction },
    );
  }

  if (hasSubstituteEmployeeId) {
    await dropFksOnColumn(queryInterface, tableName, 'substitute_employee_id', transaction);

    await queryInterface.sequelize.query(
      `
      UPDATE \`${tableName}\` AS t
      INNER JOIN employee AS e
        ON e.employee_id = t.substitute_employee_id
      SET t.substitute_user_id = e.user_id
      WHERE t.substitute_employee_id IS NOT NULL
        AND (t.substitute_user_id IS NULL)
      `,
      { transaction },
    );
  }

  await dropIndexIfExists(
    queryInterface,
    tableName,
    'uq_teacher_substitute_employee_substitute',
    transaction,
  );

  if (hasEmployeeId) {
    await queryInterface.removeColumn(tableName, 'employee_id', { transaction });
  }
  if (hasSubstituteEmployeeId) {
    await queryInterface.removeColumn(tableName, 'substitute_employee_id', { transaction });
  }

  const [existingUserIndex] = await queryInterface.sequelize.query(
    `
    SELECT INDEX_NAME AS indexName
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    LIMIT 1
    `,
    { replacements: [tableName, 'uq_teacher_substitute_user_substitute'], transaction },
  );

  if (existingUserIndex.length === 0) {
    await queryInterface.addIndex(tableName, {
      fields: ['user_id', 'substitute_user_id'],
      unique: true,
      name: 'uq_teacher_substitute_user_substitute',
      transaction,
    });
  }
}

async function revertTeacherSubstitute(queryInterface, Sequelize, transaction) {
  const tableName = 'teacher_substitute';
  if (!(await tableExists(queryInterface, tableName, transaction))) {
    return;
  }

  const hasEmployeeId = await columnExists(queryInterface, tableName, 'employee_id', transaction);
  const hasSubstituteEmployeeId = await columnExists(
    queryInterface,
    tableName,
    'substitute_employee_id',
    transaction,
  );
  const hasUserId = await columnExists(queryInterface, tableName, 'user_id', transaction);
  const hasSubstituteUserId = await columnExists(
    queryInterface,
    tableName,
    'substitute_user_id',
    transaction,
  );

  if (!hasEmployeeId) {
    await queryInterface.addColumn(
      tableName,
      'employee_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'employee',
          key: 'employee_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      { transaction },
    );
  }

  if (!hasSubstituteEmployeeId) {
    await queryInterface.addColumn(
      tableName,
      'substitute_employee_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'employee',
          key: 'employee_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      { transaction },
    );
  }

  if (hasUserId) {
    await queryInterface.sequelize.query(
      `
      UPDATE \`${tableName}\` AS t
      INNER JOIN employee AS e
        ON e.user_id = t.user_id
      SET t.employee_id = e.employee_id
      WHERE t.user_id IS NOT NULL
        AND (t.employee_id IS NULL)
      `,
      { transaction },
    );
  }

  if (hasSubstituteUserId) {
    await queryInterface.sequelize.query(
      `
      UPDATE \`${tableName}\` AS t
      INNER JOIN employee AS e
        ON e.user_id = t.substitute_user_id
      SET t.substitute_employee_id = e.employee_id
      WHERE t.substitute_user_id IS NOT NULL
        AND (t.substitute_employee_id IS NULL)
      `,
      { transaction },
    );
  }

  await dropIndexIfExists(
    queryInterface,
    tableName,
    'uq_teacher_substitute_user_substitute',
    transaction,
  );

  if (hasSubstituteUserId) {
    await dropFksOnColumn(queryInterface, tableName, 'substitute_user_id', transaction);
    await queryInterface.removeColumn(tableName, 'substitute_user_id', { transaction });
  }

  const [existingEmpIndex] = await queryInterface.sequelize.query(
    `
    SELECT INDEX_NAME AS indexName
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    LIMIT 1
    `,
    { replacements: [tableName, 'uq_teacher_substitute_employee_substitute'], transaction },
  );

  if (existingEmpIndex.length === 0) {
    await queryInterface.addIndex(tableName, {
      fields: ['employee_id', 'substitute_employee_id'],
      unique: true,
      name: 'uq_teacher_substitute_employee_substitute',
      transaction,
    });
  }
}

async function dropLessonEmployeeId(queryInterface, transaction) {
  const tableName = 'lesson';
  if (!(await tableExists(queryInterface, tableName, transaction))) {
    return;
  }

  const hasEmployeeId = await columnExists(queryInterface, tableName, 'employee_id', transaction);
  if (!hasEmployeeId) {
    return;
  }

  await dropFksOnColumn(queryInterface, tableName, 'employee_id', transaction);
  await queryInterface.removeColumn(tableName, 'employee_id', { transaction });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const tableName of SIMPLE_TABLES) {
        await migrateSimpleTable(queryInterface, Sequelize, tableName, transaction);
      }
      await migrateTeacherSubstitute(queryInterface, Sequelize, transaction);
      await dropLessonEmployeeId(queryInterface, transaction);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await revertTeacherSubstitute(queryInterface, Sequelize, transaction);
      for (const tableName of SIMPLE_TABLES) {
        await revertSimpleTable(queryInterface, Sequelize, tableName, transaction);
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

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
  const table = await queryInterface.describeTable(tableName, { transaction });
  return Boolean(table[columnName]);
}

async function dropForeignKeysOnColumn(queryInterface, tableName, columnName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
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

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const hasSectionTable = await tableExists(queryInterface, 'section', transaction);
      const hasSectionIdColumn = await columnExists(
        queryInterface,
        'class_sections',
        'section_id',
        transaction,
      );

      if (hasSectionTable && hasSectionIdColumn) {
        await queryInterface.sequelize.query(
          `
          UPDATE class_sections cs
          INNER JOIN section s ON s.section_id = cs.section_id
          SET cs.section = COALESCE(
            NULLIF(TRIM(cs.section), ''),
            s.section_name
          )
          WHERE cs.section IS NULL OR TRIM(cs.section) = ''
          `,
          { transaction },
        );
      }

      if (hasSectionIdColumn) {
        await queryInterface.sequelize.query(
          `
          UPDATE class_sections
          SET section = CONCAT('Section-', section_id)
          WHERE (section IS NULL OR TRIM(section) = '')
            AND section_id IS NOT NULL
          `,
          { transaction },
        );

        await dropForeignKeysOnColumn(queryInterface, 'class_sections', 'section_id', transaction);
        await queryInterface.removeColumn('class_sections', 'section_id', { transaction });
      }

      const classSectionsTable = await queryInterface.describeTable('class_sections', { transaction });
      if (classSectionsTable.section && classSectionsTable.section.allowNull !== false) {
        await queryInterface.changeColumn(
          'class_sections',
          'section',
          {
            type: Sequelize.STRING,
            allowNull: false,
          },
          { transaction },
        );
      }

      if (hasSectionTable) {
        const [constraints] = await queryInterface.sequelize.query(
          `
          SELECT CONSTRAINT_NAME
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'section'
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
          `,
          { transaction },
        );

        for (const { CONSTRAINT_NAME } of constraints) {
          await queryInterface.sequelize.query(
            `ALTER TABLE \`section\` DROP FOREIGN KEY \`${CONSTRAINT_NAME}\``,
            { transaction },
          );
        }

        await queryInterface.dropTable('section', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const hasSectionTable = await tableExists(queryInterface, 'section', transaction);
      if (!hasSectionTable) {
        await queryInterface.createTable(
          'section',
          {
            section_id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            university_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            acedmic_year_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            institute_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            section_name: {
              type: Sequelize.STRING,
              allowNull: false,
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
            created_by: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            updated_by: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            deleted_at: {
              type: Sequelize.DATE,
              allowNull: true,
            },
          },
          { transaction },
        );
      }

      const hasSectionIdColumn = await columnExists(
        queryInterface,
        'class_sections',
        'section_id',
        transaction,
      );
      if (!hasSectionIdColumn) {
        await queryInterface.addColumn(
          'class_sections',
          'section_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'section', key: 'section_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};

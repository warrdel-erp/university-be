'use strict';

const ASSET_CATEGORIES = [
  { name: 'Land & Buildings', code_prefix: 'LDB' },
  { name: 'Furniture & Fixtures', code_prefix: 'FURN' },
  { name: 'IT Assets', code_prefix: 'IT' },
  { name: 'Software & Licenses', code_prefix: 'SWL' },
  { name: 'Office Equipment', code_prefix: 'AV' },
  { name: 'Vehicles', code_prefix: 'VEH' },
  { name: 'Plant & Machinery', code_prefix: 'PLM' },
  { name: 'Electrical & Utility Equipment', code_prefix: 'ELE' },
  { name: 'Tools & Instruments', code_prefix: 'LIB' },
  { name: 'Security Equipment', code_prefix: 'SEC' },
  { name: 'Other Equipment', code_prefix: 'OTH' },
  { name: 'Intangible Assets', code_prefix: 'INT' },
];

const ASSET_CATEGORY_NAMES = ASSET_CATEGORIES.map((row) => row.name);

const CATEGORY_CODE_PREFIX_BY_NAME = Object.fromEntries(
  ASSET_CATEGORIES.map((row) => [row.name, row.code_prefix])
);

function normalizeCategoryCodePrefix(prefix) {
  return String(prefix)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

async function assetCategoriesTableExists(queryInterface, transaction) {
  const [tables] = await queryInterface.sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asset_categories'`,
    { transaction }
  );
  return tables.length > 0;
}

async function columnExists(queryInterface, columnName, transaction) {
  const [columns] = await queryInterface.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'asset_categories'
       AND COLUMN_NAME = ?`,
    { replacements: [columnName], transaction }
  );
  return columns.length > 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      if (!(await assetCategoriesTableExists(queryInterface, transaction))) {
        return;
      }

      if (!(await columnExists(queryInterface, 'code_prefix', transaction))) {
        await queryInterface.addColumn(
          'asset_categories',
          'code_prefix',
          {
            type: Sequelize.STRING(8),
            allowNull: true,
            after: 'name',
          },
          { transaction }
        );
      }

      const [institutes] = await queryInterface.sequelize.query(
        'SELECT institute_id FROM institute',
        { transaction }
      );

      if (institutes.length) {
        const [existingRows] = await queryInterface.sequelize.query(
          'SELECT institute_id, name FROM asset_categories',
          { transaction }
        );

        const existingByInstitute = new Map();
        for (const row of existingRows) {
          if (!existingByInstitute.has(row.institute_id)) {
            existingByInstitute.set(row.institute_id, new Set());
          }
          existingByInstitute.get(row.institute_id).add(row.name);
        }

        const now = new Date();
        const toInsert = [];

        for (const { institute_id: instituteId } of institutes) {
          const existingNames = existingByInstitute.get(instituteId) ?? new Set();

          for (const category of ASSET_CATEGORIES) {
            if (!existingNames.has(category.name)) {
              toInsert.push({
                name: category.name,
                code_prefix: normalizeCategoryCodePrefix(category.code_prefix),
                institute_id: instituteId,
                created_at: now,
                updated_at: now,
              });
            }
          }
        }

        if (toInsert.length) {
          await queryInterface.bulkInsert('asset_categories', toInsert, { transaction });
        }
      }

      for (const [name, prefix] of Object.entries(CATEGORY_CODE_PREFIX_BY_NAME)) {
        await queryInterface.sequelize.query(
          `UPDATE asset_categories
           SET code_prefix = ?
           WHERE name = ? AND (code_prefix IS NULL OR code_prefix = '')`,
          {
            replacements: [normalizeCategoryCodePrefix(prefix), name],
            transaction,
          }
        );
      }

      await queryInterface.sequelize.query(
        `UPDATE asset_categories
         SET code_prefix = 'IT'
         WHERE name = 'IT Assets' AND code_prefix IN ('COMP', 'comp')`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      if (!(await assetCategoriesTableExists(queryInterface, transaction))) {
        return;
      }

      const namePlaceholders = ASSET_CATEGORY_NAMES.map(() => '?').join(', ');

      await queryInterface.sequelize.query(
        `DELETE ac FROM asset_categories ac
         WHERE ac.name IN (${namePlaceholders})
           AND NOT EXISTS (
             SELECT 1 FROM asset a
             WHERE a.asset_category_id = ac.asset_category_id
           )`,
        {
          replacements: ASSET_CATEGORY_NAMES,
          transaction,
        }
      );

      if (await columnExists(queryInterface, 'code_prefix', transaction)) {
        await queryInterface.removeColumn('asset_categories', 'code_prefix', { transaction });
      }
    });
  },
};

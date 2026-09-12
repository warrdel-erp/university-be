'use strict';

/**
 * Move official contact fields from employee_address → employee_office.
 * Idempotent: skips missing tables/columns; DML runs in a transaction.
 *
 * Note: MySQL DDL (ADD/DROP COLUMN) causes an implicit commit, so schema
 * changes are applied carefully before/after the data transaction.
 */

async function getColumnNames(queryInterface, tableName, transaction) {
  const [cols] = await queryInterface.sequelize.query(
    `SHOW COLUMNS FROM \`${tableName}\`;`,
    { transaction },
  );
  return cols.map((c) => c.Field);
}

async function tableExists(queryInterface, tableName, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT COUNT(*) AS cnt
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = :tableName
    `,
    {
      replacements: { tableName },
      transaction,
    },
  );
  return Number(rows[0].cnt) > 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('SET @OLD_SQL_MODE = @@SESSION.sql_mode;');
    await queryInterface.sequelize.query(
      "SET SESSION sql_mode = REPLACE(REPLACE(@@SESSION.sql_mode, 'NO_ZERO_DATE', ''), 'NO_ZERO_IN_DATE', '');",
    );

    try {
      if (!(await tableExists(queryInterface, 'employee_office'))) {
        return;
      }
      if (!(await tableExists(queryInterface, 'employee_address'))) {
        return;
      }

      // --- DDL: ensure target columns exist on employee_office ---
      let officeColNames = await getColumnNames(queryInterface, 'employee_office');

      if (!officeColNames.includes('official_email_id')) {
        await queryInterface.addColumn('employee_office', 'official_email_id', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }

      if (!officeColNames.includes('official_mobile_number')) {
        await queryInterface.addColumn('employee_office', 'official_mobile_number', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }

      // Refresh after possible DDL
      officeColNames = await getColumnNames(queryInterface, 'employee_office');
      const addressColNames = await getColumnNames(queryInterface, 'employee_address');

      const transaction = await queryInterface.sequelize.transaction();

      try {
        // 1. Copy phone_number → mobile_number on address (only if both exist)
        if (
          addressColNames.includes('phone_number') &&
          addressColNames.includes('mobile_number')
        ) {
          await queryInterface.sequelize.query(
            `
              UPDATE employee_address
              SET mobile_number = phone_number
              WHERE (mobile_number IS NULL OR TRIM(mobile_number) = '')
                AND phone_number IS NOT NULL
                AND TRIM(phone_number) != ''
            `,
            { transaction },
          );
        }

        // 2. Resolve source columns from address (correct + legacy spellings)
        const emailSrcCol = addressColNames.includes('official_email_id')
          ? 'ea.official_email_id'
          : addressColNames.includes('offical_email_id')
            ? 'ea.offical_email_id'
            : null;

        const mobileSrcCol = addressColNames.includes('official_mobile_number')
          ? 'ea.official_mobile_number'
          : addressColNames.includes('offical_mobile_number')
            ? 'ea.offical_mobile_number'
            : null;

        if (
          (emailSrcCol || mobileSrcCol) &&
          officeColNames.includes('official_email_id') &&
          officeColNames.includes('official_mobile_number')
        ) {
          const setClauses = [];
          if (emailSrcCol) {
            setClauses.push(
              `eo.official_email_id = COALESCE(NULLIF(TRIM(eo.official_email_id), ''), NULLIF(TRIM(${emailSrcCol}), ''))`,
            );
          }
          if (mobileSrcCol) {
            setClauses.push(
              `eo.official_mobile_number = COALESCE(NULLIF(TRIM(eo.official_mobile_number), ''), NULLIF(TRIM(${mobileSrcCol}), ''))`,
            );
          }

          if (setClauses.length > 0) {
            await queryInterface.sequelize.query(
              `
                UPDATE employee_office eo
                INNER JOIN employee_address ea ON eo.employee_id = ea.employee_id
                SET ${setClauses.join(', ')}
                WHERE ea.deleted_at IS NULL
              `,
              { transaction },
            );
          }

          const hasCreatedBy = addressColNames.includes('created_by');

          await queryInterface.sequelize.query(
            `
              INSERT INTO employee_office (
                employee_id,
                official_email_id,
                official_mobile_number,
                created_by,
                created_at,
                updated_at
              )
              SELECT
                ea.employee_id,
                ${emailSrcCol ? `NULLIF(TRIM(${emailSrcCol}), '')` : 'NULL'},
                ${mobileSrcCol ? `NULLIF(TRIM(${mobileSrcCol}), '')` : 'NULL'},
                ${hasCreatedBy ? 'COALESCE(ea.created_by, 1)' : '1'},
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
              FROM employee_address ea
              LEFT JOIN employee_office eo ON eo.employee_id = ea.employee_id
              WHERE eo.employee_office_id IS NULL
                AND ea.deleted_at IS NULL
                AND (
                  ${emailSrcCol ? `(${emailSrcCol} IS NOT NULL AND TRIM(${emailSrcCol}) != '')` : 'FALSE'}
                  OR
                  ${mobileSrcCol ? `(${mobileSrcCol} IS NOT NULL AND TRIM(${mobileSrcCol}) != '')` : 'FALSE'}
                )
            `,
            { transaction },
          );
        }

        // 3. Merge interim legacy columns on employee_office into official_*
        if (officeColNames.includes('office_mail_id')) {
          await queryInterface.sequelize.query(
            `
              UPDATE employee_office
              SET official_email_id = COALESCE(NULLIF(TRIM(official_email_id), ''), NULLIF(TRIM(office_mail_id), ''))
              WHERE office_mail_id IS NOT NULL
                AND TRIM(office_mail_id) != ''
            `,
            { transaction },
          );
        }

        if (officeColNames.includes('offical_email_id')) {
          await queryInterface.sequelize.query(
            `
              UPDATE employee_office
              SET official_email_id = COALESCE(NULLIF(TRIM(official_email_id), ''), NULLIF(TRIM(offical_email_id), ''))
              WHERE offical_email_id IS NOT NULL
                AND TRIM(offical_email_id) != ''
            `,
            { transaction },
          );
        }

        if (officeColNames.includes('offical_mobile_number')) {
          await queryInterface.sequelize.query(
            `
              UPDATE employee_office
              SET official_mobile_number = COALESCE(NULLIF(TRIM(official_mobile_number), ''), NULLIF(TRIM(offical_mobile_number), ''))
              WHERE offical_mobile_number IS NOT NULL
                AND TRIM(offical_mobile_number) != ''
            `,
            { transaction },
          );
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      // --- DDL cleanup after successful data migration ---
      const currentOfficeColNames = await getColumnNames(queryInterface, 'employee_office');
      const currentAddressColNames = await getColumnNames(queryInterface, 'employee_address');

      if (currentOfficeColNames.includes('office_mail_id')) {
        await queryInterface.removeColumn('employee_office', 'office_mail_id');
      }
      if (currentOfficeColNames.includes('offical_email_id')) {
        await queryInterface.removeColumn('employee_office', 'offical_email_id');
      }
      if (currentOfficeColNames.includes('offical_mobile_number')) {
        await queryInterface.removeColumn('employee_office', 'offical_mobile_number');
      }

      if (currentAddressColNames.includes('offical_mobile_number')) {
        await queryInterface.removeColumn('employee_address', 'offical_mobile_number');
      }
      if (currentAddressColNames.includes('official_mobile_number')) {
        await queryInterface.removeColumn('employee_address', 'official_mobile_number');
      }
      if (currentAddressColNames.includes('offical_email_id')) {
        await queryInterface.removeColumn('employee_address', 'offical_email_id');
      }
      if (currentAddressColNames.includes('official_email_id')) {
        await queryInterface.removeColumn('employee_address', 'official_email_id');
      }
      if (currentAddressColNames.includes('phone_number')) {
        await queryInterface.removeColumn('employee_address', 'phone_number');
      }
    } finally {
      await queryInterface.sequelize.query('SET SESSION sql_mode = @OLD_SQL_MODE;');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('SET @OLD_SQL_MODE = @@SESSION.sql_mode;');
    await queryInterface.sequelize.query(
      "SET SESSION sql_mode = REPLACE(REPLACE(@@SESSION.sql_mode, 'NO_ZERO_DATE', ''), 'NO_ZERO_IN_DATE', '');",
    );

    try {
      if (!(await tableExists(queryInterface, 'employee_office'))) {
        return;
      }
      if (!(await tableExists(queryInterface, 'employee_address'))) {
        return;
      }

      let addressColNames = await getColumnNames(queryInterface, 'employee_address');

      if (!addressColNames.includes('phone_number')) {
        await queryInterface.addColumn('employee_address', 'phone_number', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }
      if (!addressColNames.includes('offical_mobile_number')) {
        await queryInterface.addColumn('employee_address', 'offical_mobile_number', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }
      if (!addressColNames.includes('offical_email_id')) {
        await queryInterface.addColumn('employee_address', 'offical_email_id', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }

      addressColNames = await getColumnNames(queryInterface, 'employee_address');
      const officeColNames = await getColumnNames(queryInterface, 'employee_office');

      const transaction = await queryInterface.sequelize.transaction();

      try {
        if (
          officeColNames.includes('official_email_id') &&
          officeColNames.includes('official_mobile_number') &&
          addressColNames.includes('offical_email_id') &&
          addressColNames.includes('offical_mobile_number')
        ) {
          await queryInterface.sequelize.query(
            `
              UPDATE employee_address ea
              INNER JOIN employee_office eo ON ea.employee_id = eo.employee_id
              SET
                ea.offical_email_id = eo.official_email_id,
                ea.offical_mobile_number = eo.official_mobile_number
              WHERE ea.deleted_at IS NULL
            `,
            { transaction },
          );
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      const latestOfficeColNames = await getColumnNames(queryInterface, 'employee_office');
      if (latestOfficeColNames.includes('official_email_id')) {
        await queryInterface.removeColumn('employee_office', 'official_email_id');
      }
      if (latestOfficeColNames.includes('official_mobile_number')) {
        await queryInterface.removeColumn('employee_office', 'official_mobile_number');
      }
    } finally {
      await queryInterface.sequelize.query('SET SESSION sql_mode = @OLD_SQL_MODE;');
    }
  },
};

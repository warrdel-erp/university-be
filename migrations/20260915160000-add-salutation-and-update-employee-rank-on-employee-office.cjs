'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const officeDescription = await queryInterface
        .describeTable('employee_office', { transaction })
        .catch(() => ({}));

      // 1. Add salutation column if not present
      if (!officeDescription.salutation) {
        await queryInterface.addColumn(
          'employee_office',
          'salutation',
          {
            type: Sequelize.STRING,
            allowNull: true,
          },
          { transaction },
        );
      }

      // 2. Find or create 'Designation' code master category in employee_code_master
      let designationMasterId = null;
      const [existingMaster] = await queryInterface.sequelize.query(
        `SELECT employee_code_master_id FROM employee_code_master 
         WHERE LOWER(code_master_type) IN ('designation', 'salutation') 
         ORDER BY (LOWER(code_master_type) = 'designation') DESC LIMIT 1`,
        { transaction },
      );

      if (existingMaster && existingMaster.length > 0) {
        designationMasterId = existingMaster[0].employee_code_master_id;
      } else {
        const [insertRes] = await queryInterface.sequelize.query(
          `INSERT INTO employee_code_master (code_master_type) VALUES ('Designation')`,
          { transaction },
        );
        designationMasterId = insertRes;
      }

      // 3. Obtain default context for code master types (university, institute, user)
      const [defaultContextRows] = await queryInterface.sequelize.query(
        `SELECT university_id, institute_id, user_id AS created_by 
         FROM users 
         WHERE university_id IS NOT NULL AND institute_id IS NOT NULL 
         LIMIT 1`,
        { transaction },
      ).catch(() => [[]]);

      const defaultUni = defaultContextRows?.[0]?.university_id || 1;
      const defaultInst = defaultContextRows?.[0]?.institute_id || 1;
      const defaultUser = defaultContextRows?.[0]?.created_by || 1;

      // 4. Preload existing code master types for this designation master
      const [existingTypes] = await queryInterface.sequelize.query(
        `SELECT employee_code_master_type_id, code, description 
         FROM employee_code_master_type 
         WHERE employee_code_master_id = ${designationMasterId}`,
        { transaction },
      );

      const typeMap = new Map();
      for (const t of existingTypes) {
        if (t.code) typeMap.set(String(t.code).trim().toLowerCase(), t.employee_code_master_type_id);
        if (t.description) typeMap.set(String(t.description).trim().toLowerCase(), t.employee_code_master_type_id);
      }

      // 5. Check which column exists: employee_rank or designation
      const currentRankCol = officeDescription.employee_rank
        ? 'employee_rank'
        : officeDescription.designation
        ? 'designation'
        : null;

      if (currentRankCol) {
        // Fetch all rows from employee_office to sanitize rank/designation & seed
        const [rows] = await queryInterface.sequelize.query(
          `SELECT employee_office_id, \`${currentRankCol}\` AS rank_val, salutation FROM employee_office`,
          { transaction },
        );

        for (const row of rows) {
          const rawVal = row.rank_val;
          let mappedId = null;
          let backfillSalutation = row.salutation;

          if (rawVal !== null && rawVal !== undefined) {
            const trimmed = String(rawVal).trim();
            if (trimmed !== '' && trimmed !== 'null') {
              // Salutation regex to backfill salutation if missing
              const salutationRegex = /^(Mr|Mrs|Ms|Miss|Dr|Prof|Shri|Smt|Master|Mx)\.?$/i;
              if ((!backfillSalutation || backfillSalutation.trim() === '') && salutationRegex.test(trimmed)) {
                backfillSalutation = trimmed;
              }

              // Check if value is already a numeric integer ID
              const num = Number(trimmed);
              if (Number.isInteger(num) && num > 0) {
                mappedId = num;
              } else {
                // Look up matching string or seed new designation code master type
                const lookupKey = trimmed.toLowerCase();
                if (typeMap.has(lookupKey)) {
                  mappedId = typeMap.get(lookupKey);
                } else {
                  const [insertTypeRes] = await queryInterface.sequelize.query(
                    `INSERT INTO employee_code_master_type 
                     (employee_code_master_id, code, description, university_id, institute_id, created_by)
                     VALUES (
                       ${designationMasterId}, 
                       ${queryInterface.sequelize.escape(trimmed)}, 
                       ${queryInterface.sequelize.escape(trimmed)}, 
                       ${defaultUni}, 
                       ${defaultInst}, 
                       ${defaultUser}
                     )`,
                    { transaction },
                  );
                  mappedId = insertTypeRes;
                  typeMap.set(lookupKey, mappedId);
                }
              }
            }
          }

          // Update employee_office row: sanitize rank_val to integer/null and update salutation
          await queryInterface.sequelize.query(
            `UPDATE employee_office 
             SET \`${currentRankCol}\` = ${mappedId !== null ? mappedId : 'NULL'},
                 salutation = ${backfillSalutation ? queryInterface.sequelize.escape(backfillSalutation) : 'salutation'}
             WHERE employee_office_id = ${row.employee_office_id}`,
            { transaction },
          );
        }

        // Rename employee_rank -> designation if needed
        if (officeDescription.employee_rank && !officeDescription.designation) {
          await queryInterface.renameColumn(
            'employee_office',
            'employee_rank',
            'designation',
            { transaction },
          );
        }

        // Safely alter column designation to INTEGER NULL
        await queryInterface.changeColumn(
          'employee_office',
          'designation',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction },
        );
      } else if (!officeDescription.designation) {
        await queryInterface.addColumn(
          'employee_office',
          'designation',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction },
        );
      }

      // 6. Add FK constraint for designation -> employee_code_master_type
      try {
        await queryInterface.addConstraint('employee_office', {
          fields: ['designation'],
          type: 'foreign key',
          name: 'fk_employee_office_designation',
          references: {
            table: 'employee_code_master_type',
            field: 'employee_code_master_type_id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          transaction,
        });
      } catch (err) {
        console.log('Constraint fk_employee_office_designation already exists or cannot be added:', err.message);
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
      const officeDescription = await queryInterface
        .describeTable('employee_office', { transaction })
        .catch(() => ({}));

      if (officeDescription.designation) {
        try {
          await queryInterface.removeConstraint(
            'employee_office',
            'fk_employee_office_designation',
            { transaction },
          );
        } catch (err) {
          console.log('Constraint fk_employee_office_designation cannot be removed:', err.message);
        }

        try {
          await queryInterface.renameColumn(
            'employee_office',
            'designation',
            'employee_rank',
            { transaction },
          );
        } catch (err) {
          console.log('Could not rename designation back to employee_rank:', err.message);
        }
      }

      if (officeDescription.salutation) {
        await queryInterface.removeColumn('employee_office', 'salutation', {
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

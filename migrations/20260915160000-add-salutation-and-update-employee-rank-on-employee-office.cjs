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

      // 2. Handle designation column (rename from employee_rank or create/change)
      if (officeDescription.employee_rank && !officeDescription.designation) {
        // Rename employee_rank -> designation
        await queryInterface.renameColumn(
          'employee_office',
          'employee_rank',
          'designation',
          { transaction },
        );

        // Ensure designation type is INTEGER
        const rankType = String(officeDescription.employee_rank.type || '').toUpperCase();
        if (!rankType.includes('INT')) {
          await queryInterface.changeColumn(
            'employee_office',
            'designation',
            {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            { transaction },
          );
        }
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
      } else {
        const designationType = String(officeDescription.designation.type || '').toUpperCase();
        if (!designationType.includes('INT')) {
          await queryInterface.changeColumn(
            'employee_office',
            'designation',
            {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            { transaction },
          );
        }
      }

      // 3. Add FK constraint for designation -> employee_code_master_type
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

        // Revert designation -> employee_rank if needed
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

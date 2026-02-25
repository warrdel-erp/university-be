module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const tableInfo = await queryInterface.describeTable('employee', { transaction: t });
      if (!tableInfo.user_id) {
        // 1. Add user_id column to employee table (temporarily allowNull: true)
        await queryInterface.addColumn('employee', 'user_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'user_id'
          },
          onUpdate: 'CASCADE'
        }, { transaction: t });

        // 2. Transfer user_id from user_student_employee to employee
        // Only where employee_id matches
        await queryInterface.sequelize.query(`
          UPDATE employee e
          JOIN user_student_employee usem ON e.employee_id = usem.employee_id
          SET e.user_id = usem.user_id
          WHERE usem.employee_id IS NOT NULL;
        `, { transaction: t });

        // 3. Make user_id mandatory (if we still want this)
        // Checking again to ensure it's there before changing column
        const updatedTableInfo = await queryInterface.describeTable('employee', { transaction: t });

        if (updatedTableInfo.user_id && updatedTableInfo.user_id.allowNull) {
          await queryInterface.changeColumn('employee', 'user_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'user_id'
            },
            onUpdate: 'CASCADE'
          },
            { transaction: t });
        }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // Remove user_id column from employee table
      await queryInterface.removeColumn('employee', 'user_id', { transaction: t });
    });
  }
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('employee');
    console.log(tableInfo);
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
      });

      // 2. Transfer user_id from user_student_employee to employee
      // Only where employee_id matches
      await queryInterface.sequelize.query(`
        UPDATE employee e
        JOIN user_student_employee usem ON e.employee_id = usem.employee_id
        SET e.user_id = usem.user_id
        WHERE usem.employee_id IS NOT NULL;
      `);

      // 3. Make user_id mandatory (if we still want this)
      // Checking again to ensure it's there before changing column
      const updatedTableInfo = await queryInterface.describeTable('employee');
      if (updatedTableInfo.user_id && updatedTableInfo.user_id.allowNull) {
        await queryInterface.changeColumn('employee', 'user_id', {
          type: Sequelize.INTEGER,
          allowNull: false,
        });
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove user_id column from employee table
    await queryInterface.removeColumn('employee', 'user_id');
  }
};

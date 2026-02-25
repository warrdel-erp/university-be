module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableInfo = await queryInterface.describeTable('students');
        if (!tableInfo.user_id) {
            // 1. Add user_id column to students table (temporarily allowNull: true)
            await queryInterface.addColumn('students', 'user_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'user_id'
                },
                onUpdate: 'CASCADE'
            });

            // 2. Transfer user_id from user_student_employee to students
            // Only where student_id matches
            await queryInterface.sequelize.query(`
                UPDATE students s
                JOIN user_student_employee usem ON s.student_id = usem.student_id
                SET s.user_id = usem.user_id
                WHERE usem.student_id IS NOT NULL;
            `);
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Remove user_id column from students table
        await queryInterface.removeColumn('students', 'user_id');
    }
};

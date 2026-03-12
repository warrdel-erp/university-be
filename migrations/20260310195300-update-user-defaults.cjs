module.exports = {
    up: async (queryInterface, Sequelize) => {
        return queryInterface.sequelize.transaction(async (t) => {
            const tableInfo = await queryInterface.describeTable('users', { transaction: t });

            // 1. Rename institute_id to default_institute_id if it exists
            if (tableInfo.institute_id && !tableInfo.default_institute_id) {
                await queryInterface.renameColumn('users', 'institute_id', 'default_institute_id', { transaction: t });
            } else if (!tableInfo.institute_id && !tableInfo.default_institute_id) {
                // If neither exists, add default_institute_id
                await queryInterface.addColumn('users', 'default_institute_id', {
                    type: Sequelize.INTEGER,
                    allowNull: true
                }, { transaction: t });
            }

            // 2. Add default_role if it doesn't exist
            if (!tableInfo.default_role) {
                await queryInterface.addColumn('users', 'default_role', {
                    type: Sequelize.STRING,
                    allowNull: true
                }, { transaction: t });
            }

            // 3. Add default_academic_year_id if it doesn't exist
            if (!tableInfo.default_academic_year_id) {
                await queryInterface.addColumn('users', 'default_academic_year_id', {
                    type: Sequelize.INTEGER,
                    allowNull: true
                }, { transaction: t });
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        return queryInterface.sequelize.transaction(async (t) => {
            const tableInfo = await queryInterface.describeTable('users', { transaction: t });

            if (tableInfo.default_institute_id) {
                await queryInterface.renameColumn('users', 'default_institute_id', 'institute_id', { transaction: t });
            }

            if (tableInfo.default_role) {
                await queryInterface.removeColumn('users', 'default_role', { transaction: t });
            }

            if (tableInfo.default_academic_year_id) {
                await queryInterface.removeColumn('users', 'default_academic_year_id', { transaction: t });
            }
        });
    }
};

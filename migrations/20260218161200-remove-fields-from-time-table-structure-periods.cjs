'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeColumn('time_table_structure_periods', 'maximum_period', { transaction });
            await queryInterface.removeColumn('time_table_structure_periods', 'course_id', { transaction });
            await queryInterface.removeColumn('time_table_structure_periods', 'period_length', { transaction });
            await queryInterface.removeColumn('time_table_structure_periods', 'period_gap', { transaction });
            await queryInterface.removeColumn('time_table_structure_periods', 'starting_time', { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.addColumn('time_table_structure_periods', 'maximum_period', {
                type: Sequelize.INTEGER,
                allowNull: true,
            }, { transaction });

            await queryInterface.addColumn('time_table_structure_periods', 'course_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'course',
                    key: 'course_id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            }, { transaction });

            await queryInterface.addColumn('time_table_structure_periods', 'period_length', {
                type: Sequelize.INTEGER,
                allowNull: true,
            }, { transaction });

            await queryInterface.addColumn('time_table_structure_periods', 'period_gap', {
                type: Sequelize.INTEGER,
                allowNull: true,
            }, { transaction });

            await queryInterface.addColumn('time_table_structure_periods', 'starting_time', {
                type: Sequelize.STRING,
                allowNull: true,
            }, { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};

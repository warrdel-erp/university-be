'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // 1. Add new columns to time_table_structure
            await queryInterface.addColumn('time_table_structure', 'maximum_period', {
                type: Sequelize.INTEGER,
                allowNull: true,
            }, { transaction });

            await queryInterface.addColumn('time_table_structure', 'course_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'course',
                    key: 'course_id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            }, { transaction });

            await queryInterface.addColumn('time_table_structure', 'period_length', {
                type: Sequelize.INTEGER,
                allowNull: true,
            }, { transaction });

            await queryInterface.addColumn('time_table_structure', 'period_gap', {
                type: Sequelize.INTEGER,
                allowNull: true,
            }, { transaction });

            await queryInterface.addColumn('time_table_structure', 'starting_time', {
                type: Sequelize.STRING,
                allowNull: true,
            }, { transaction });

            // 2. Populate the new columns from time_table_structure_periods
            //    For maximum_period, course_id, period_length, period_gap: take any row per structure
            //    For starting_time: take the row with the earliest time value

            const [structures] = await queryInterface.sequelize.query(
                `SELECT time_table_name_id FROM time_table_structure WHERE deleted_at IS NULL`,
                { transaction }
            );

            // Parse a time string like "08:30", "10:30 AM", "02:15 PM" into total minutes
            const parseTime = (str) => {
                if (!str) return Infinity;
                str = str.trim();
                const parts = str.split(' ');
                const [hourStr, minuteStr] = parts[0].split(':');
                let hour = parseInt(hourStr, 10);
                const minute = parseInt(minuteStr, 10) || 0;
                const modifier = parts[1] ? parts[1].toUpperCase() : null;
                if (modifier === 'PM' && hour !== 12) hour += 12;
                if (modifier === 'AM' && hour === 12) hour = 0;
                return hour * 60 + minute;
            };

            for (const structure of structures) {
                const id = structure.time_table_name_id;

                // Get any row for the scalar fields
                const [anyRows] = await queryInterface.sequelize.query(
                    `SELECT maximum_period, course_id, period_length, period_gap
                     FROM time_table_structure_periods
                     WHERE time_table_name_id = ${id} AND deleted_at IS NULL
                     LIMIT 1`,
                    { transaction }
                );

                if (!anyRows.length) continue;

                const { maximum_period, course_id, period_length, period_gap } = anyRows[0];

                // Get all starting_time values for this structure to find the minimum
                const [timeRows] = await queryInterface.sequelize.query(
                    `SELECT starting_time FROM time_table_structure_periods
                     WHERE time_table_name_id = ${id} AND deleted_at IS NULL
                       AND starting_time IS NOT NULL AND starting_time != ''`,
                    { transaction }
                );

                let minTime = Infinity;
                let minStartingTime = null;
                for (const row of timeRows) {
                    const t = parseTime(row.starting_time);
                    if (t < minTime) {
                        minTime = t;
                        minStartingTime = row.starting_time;
                    }
                }

                await queryInterface.sequelize.query(
                    `UPDATE time_table_structure
                     SET maximum_period = ?, course_id = ?, period_length = ?, period_gap = ?, starting_time = ?
                     WHERE time_table_name_id = ?`,
                    {
                        replacements: [maximum_period, course_id, period_length, period_gap, minStartingTime, id],
                        transaction,
                    }
                );
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
            await queryInterface.removeColumn('time_table_structure', 'starting_time', { transaction });
            await queryInterface.removeColumn('time_table_structure', 'period_gap', { transaction });
            await queryInterface.removeColumn('time_table_structure', 'period_length', { transaction });
            await queryInterface.removeColumn('time_table_structure', 'course_id', { transaction });
            await queryInterface.removeColumn('time_table_structure', 'maximum_period', { transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};

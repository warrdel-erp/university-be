'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.createTable('user_roles', {
                user_role_id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false
                },
                user_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'users',
                        key: 'user_id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                role: {
                    type: Sequelize.ENUM('ADMIN', 'TEACHER', 'STUDENT'),
                    allowNull: false
                },
                created_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                updated_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                deleted_at: {
                    type: Sequelize.DATE,
                    allowNull: true
                }
            }, { transaction });

            const [users] = await queryInterface.sequelize.query('SELECT user_id, role FROM users', { transaction });
            const userRoles = [];

            users.forEach(user => {
                if (user.role === 'Teacher') {
                    userRoles.push({ user_id: user.user_id, role: 'TEACHER', created_at: new Date(), updated_at: new Date() });
                } else if (user.role === 'Student') {
                    userRoles.push({ user_id: user.user_id, role: 'STUDENT', created_at: new Date(), updated_at: new Date() });
                } else if (user.role === 'Admin') {
                    userRoles.push({ user_id: user.user_id, role: 'ADMIN', created_at: new Date(), updated_at: new Date() });
                } else if (user.role === 'Head') {
                    userRoles.push({ user_id: user.user_id, role: 'ADMIN', created_at: new Date(), updated_at: new Date() });
                    userRoles.push({ user_id: user.user_id, role: 'TEACHER', created_at: new Date(), updated_at: new Date() });
                }
            });

            if (userRoles.length > 0) {
                await queryInterface.bulkInsert('user_roles', userRoles, { transaction });
            }
        });
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.dropTable('user_roles', { transaction });
        });
    }
};

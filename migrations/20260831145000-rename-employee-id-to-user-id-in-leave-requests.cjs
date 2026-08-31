'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('leave_requests');
    
    if (tableDesc['employee_id'] && !tableDesc['user_id']) {
        console.log("Finding foreign keys for employee_id...");
        const refs = await queryInterface.getForeignKeyReferencesForTable('leave_requests');
        const fk = refs.find(r => r.columnName === 'employee_id');
        
        if (fk) {
            console.log("Dropping FK: ", fk.constraintName);
            await queryInterface.removeConstraint('leave_requests', fk.constraintName);
        }
        
        console.log("Renaming column to user_id...");
        await queryInterface.renameColumn('leave_requests', 'employee_id', 'user_id');
        
        console.log("Adding new FK to users...");
        await queryInterface.addConstraint('leave_requests', {
            fields: ['user_id'],
            type: 'foreign key',
            name: 'leave_requests_user_id_fk',
            references: {
                table: 'users',
                field: 'user_id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Revert logic
    const tableDesc = await queryInterface.describeTable('leave_requests');
    if (tableDesc['user_id'] && !tableDesc['employee_id']) {
        const refs = await queryInterface.getForeignKeyReferencesForTable('leave_requests');
        const fk = refs.find(r => r.columnName === 'user_id');
        if (fk) {
            await queryInterface.removeConstraint('leave_requests', fk.constraintName);
        }
        await queryInterface.renameColumn('leave_requests', 'user_id', 'employee_id');
    }
  }
};

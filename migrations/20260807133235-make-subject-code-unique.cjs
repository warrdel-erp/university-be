'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const [subjects] = await queryInterface.sequelize.query(
      `SELECT subject_id, subject_code FROM subject ORDER BY subject_code, created_at ASC;`
    );

    const codeCounts = new Map();
    const updates = [];

    for (const sub of subjects) {
      const code = sub.subject_code;
      const count = codeCounts.get(code) || 0;
      
      if (count > 0) {
        const newCode = `${code}-${count}`;
        updates.push({ id: sub.subject_id, newCode });
      }
      
      codeCounts.set(code, count + 1);
    }

    for (const update of updates) {
      await queryInterface.sequelize.query(
        `UPDATE subject SET subject_code = :newCode WHERE subject_id = :id;`,
        {
          replacements: { newCode: update.newCode, id: update.id }
        }
      );
    }

    await queryInterface.addConstraint('subject', {
      fields: ['subject_code'],
      type: 'unique',
      name: 'unique_subject_code_constraint'
    });
  },

  async down (queryInterface, Sequelize) {
    try {
      await queryInterface.removeConstraint('subject', 'unique_subject_code_constraint');
    } catch (err) {
      console.log('Constraint could not be removed', err.message);
    }
  }
};

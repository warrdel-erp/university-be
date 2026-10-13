'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Fetch all taken emails (lowercased & trimmed) to prevent new collisions
      const [allUsers] = await queryInterface.sequelize.query(`
        SELECT email FROM users WHERE email IS NOT NULL AND TRIM(email) != ''
      `, { transaction });

      const takenEmails = new Set(
        allUsers.map((u) => (u.email || '').trim().toLowerCase())
      );

      // 2. Find duplicate emails (case-insensitive & trimmed)
      const [duplicates] = await queryInterface.sequelize.query(`
        SELECT LOWER(TRIM(email)) AS email, COUNT(*) AS count
        FROM users
        WHERE email IS NOT NULL AND TRIM(email) != ''
        GROUP BY LOWER(TRIM(email))
        HAVING count > 1
      `, { transaction });

      console.log(`Found ${duplicates.length} duplicate email groups in users table.`);

      // 3. For each duplicate email, keep the first (active/oldest) and update subsequent records
      for (const dup of duplicates) {
        const [rows] = await queryInterface.sequelize.query(`
          SELECT user_id, email, created_at, deleted_at
          FROM users
          WHERE LOWER(TRIM(email)) = :email
          ORDER BY 
            CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END ASC,
            created_at ASC,
            user_id ASC
        `, {
          replacements: { email: dup.email },
          transaction
        });

        if (rows.length > 1) {
          const keepUser = rows[0];
          console.log(`Keeping original email for user_id ${keepUser.user_id}: ${keepUser.email}`);

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const rawEmail = (row.email || '').trim();
            const atIndex = rawEmail.lastIndexOf('@');
            const localPart = atIndex !== -1 ? rawEmail.substring(0, atIndex) : rawEmail;
            const domainPart = atIndex !== -1 ? rawEmail.substring(atIndex) : '';

            let counter = i;
            let candidateEmail = domainPart
              ? `${localPart}+duplicate${counter}${domainPart}`
              : `${localPart}_duplicate${counter}`;

            while (takenEmails.has(candidateEmail.toLowerCase())) {
              counter++;
              candidateEmail = domainPart
                ? `${localPart}+duplicate${counter}${domainPart}`
                : `${localPart}_duplicate${counter}`;
            }

            takenEmails.add(candidateEmail.toLowerCase());

            await queryInterface.sequelize.query(`
              UPDATE users
              SET email = :newEmail
              WHERE user_id = :userId
            `, {
              replacements: {
                newEmail: candidateEmail,
                userId: row.user_id
              },
              transaction
            });

            console.log(`Updated user_id ${row.user_id}: ${row.email} -> ${candidateEmail}`);
          }
        }
      }

      // 4. Normalize all emails to trimmed lowercase
      await queryInterface.sequelize.query(`
        UPDATE users
        SET email = LOWER(TRIM(email))
        WHERE email IS NOT NULL
      `, { transaction });

      // 5. Check if any existing index on 'email' is non-unique (e.g. 'email_index')
      const [existingIndexes] = await queryInterface.sequelize.query(`
        SHOW INDEX FROM users WHERE Column_name = 'email'
      `, { transaction });

      const nonUniqueEmailIndex = existingIndexes.find(
        (idx) => idx.Key_name === 'email_index' && idx.Non_unique === 1
      );

      if (nonUniqueEmailIndex) {
        await queryInterface.removeIndex('users', 'email_index', { transaction });
      }

      // 6. Add unique constraint / index on email
      await queryInterface.addIndex('users', ['email'], {
        unique: true,
        name: 'unique_users_email',
        transaction
      });

      await transaction.commit();
      console.log('Migration successfully completed: duplicate emails resolved and unique constraint added.');
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex('users', 'unique_users_email', { transaction });
      await queryInterface.addIndex('users', ['email'], {
        name: 'email_index',
        transaction
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

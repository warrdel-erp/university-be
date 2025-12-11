# 🌱 Seeder Documentation

-------------------------------------------------------------------
## 📋 Table of Contents
1. What Are Seeders?
2. Why We Use Seeders
3. How Seeder Files Work
4. Required Project Configuration
5. Seeder Commands
6. Creating a Seeder
7. Seeder Operations (Insert, Update, Delete)
8. Important
9. Main
-------------------------------------------------------------------

## 📘 1. What Are Seeders?

Seeders are used to insert **initial data** or **dummy data** into the database.

Typical use cases:
- Insert master data (countries, roles, settings)
- Insert development testing data
- Create default admin user
- Insert sample or mock data

Seeders make sure developers and testers have the **same sample data**.

Seeders DO NOT modify tables — only data.

-------------------------------------------------------------------

## 🌟 2. Why We Use Seeders

Seeders ensure:

- Consistent data across all environments  
- No need to manually insert master data  
- Faster onboarding of new developers  
- Repeatable testing  
- Automatic data setup during CI/CD  

Seeders are extremely important for large projects.

-------------------------------------------------------------------

## 🧩 3. How Seeder Files Work

Every seeder file contains TWO functions:

✔ up() → Insert data  
✔ down() → Delete data (rollback)

Structure:
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // insert rows
  },

  down: async (queryInterface, Sequelize) => {
    // remove rows
  }
};

-------------------------------------------------------------------

## 🗂️ 4. Required Configuration for Seeders

Seeders work with the SAME `.sequelizerc` and `config.cjs` used for migrations.

Your folder structure:

/seeders             ← Seeder files (.cjs)
/migrations          ← Migration files
/database/config.cjs ← Database config for CLI

-------------------------------------------------------------------

## 🛠️ 5. Seeder Commands (package.json)

Add:

"scripts": {
  "seed": "npx sequelize-cli db:seed:all --env development",
  "seed:undo": "npx sequelize-cli db:seed:undo --env development",
  "seed:undo:all": "npx sequelize-cli db:seed:undo:all --env development"
}

Run all seeders:
npm run seed

Undo last seeder:
npm run seed:undo

Undo ALL seeders:
npm run seed:undo:all

-------------------------------------------------------------------

## 📝 6. Creating a Seeder

Generate a new seeder file:

npx sequelize-cli seed:generate --name demo-job-settings

This creates:

seeders/20251212145500-demo-job-settings.js

Rename to .cjs:

seeders/20251212145500-demo-job-settings.cjs

-------------------------------------------------------------------

# 🧱 7. Seeder Operations (Examples)

-------------------------------------------------------------------
## 7.1 Insert Data (Most Common)
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("job_settings", [
      {
        job_type_name: "Lecture",
        default_duration: 60,
        color_code: "#3498db",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        job_type_name: "Lab",
        default_duration: 120,
        color_code: "#2ecc71",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("job_settings", null);
  }
};

-------------------------------------------------------------------
## 7.2 Insert With Condition
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("roles", [
      {
        name: "Admin",
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("roles", { name: "Admin" });
  }
};

-------------------------------------------------------------------
## 7.3 Delete Only Specific Rows
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert("departments", [
      { name: "IT", created_at: new Date(), updated_at: new Date() },
      { name: "HR", created_at: new Date(), updated_at: new Date() }
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("departments", {
      name: ["IT", "HR"]
    });
  }
};

-------------------------------------------------------------------
## 7.4 Update Data Using Seeders
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkUpdate(
      "job_settings",
      { is_active: false },
      { job_type_name: "Lecture" }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.bulkUpdate(
      "job_settings",
      { is_active: true },
      { job_type_name: "Lecture" }
    );
  }
};

-------------------------------------------------------------------
## 7.5 Using Seeders to Create an Admin User
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert("users", [
      {
        name: "Super Admin",
        email: "admin@example.com",
        password: "hashedpassword",
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("users", {
      email: "admin@example.com"
    });
  }
};

-------------------------------------------------------------------

# 🌟 8. Important

✔ Seeders must ONLY modify data, not schema  
✔ Never edit old seeder files — always create new ones  
✔ Always write a rollback version  
✔ Use real timestamps (new Date())  
✔ Use seeders for static or reference data  
✔ Use clear naming:  
   20251212-add-default-job-settings.cjs  

-------------------------------------------------------------------

# ❗ 9. Main

Error: Cannot import file  
→ Seeder must be `.cjs`

Error: Table does not exist  
→ Run migrations BEFORE seeders

Error: Duplicate entry  
→ Remove existing rows in down()  
→ Or use conditions

Error: Timestamp missing  
→ Ensure you insert created_at, updated_at

If any error occurs, send the file—I will correct it.

-------------------------------------------------------------------
# ✅ END OF SEEDER DOCUMENT

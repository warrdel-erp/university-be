# University ERP Backend - Complete Project Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Authorization](#authentication--authorization)
7. [Database](#database)
8. [Setup & Installation](#setup--installation)
9. [Environment Variables](#environment-variables)
10. [Features](#features)

---

## 🎯 Project Overview

**University ERP Backend** is a comprehensive Enterprise Resource Planning system designed for managing all aspects of a university or educational institution. It provides a complete backend solution for student management, employee management, academic operations, fee management, library management, and more.

### Key Capabilities
- Student Information Management
- Employee/Staff Management
- Academic Management (Courses, Semesters, Subjects)
- Fee Management & Invoicing
- Library Management
- Attendance Tracking
- Timetable Management
- Exam Management
- Transport & Vehicle Management
- Dormitory Management
- Leave Management
- Role-Based Access Control

---

## 🛠️ Technology Stack

### Core Technologies
- **Runtime:** Node.js
- **Framework:** Express.js 4.19.2
- **Database:** MySQL
- **ORM:** Sequelize 6.37.3
- **Language:** JavaScript (ES Modules)

### Key Dependencies
- **Authentication:** jsonwebtoken, bcryptjs
- **File Upload:** express-fileupload, multer, multer-s3
- **Cloud Storage:** aws-sdk
- **Email:** nodemailer
- **Data Processing:** csv-parser, xlsx
- **Utilities:** moment, uuid, dotenv

### Development Tools
- **Dev Server:** nodemon
- **Migration System:** Custom migration scripts

---

## 📁 Project Structure

```
university-erp-be/
├── controllers/          # Business logic controllers (60 files)
├── database/            # Database configuration & migrations
│   ├── dbConfig.js      # Database connection config
│   ├── sequelizeConfig.js # Sequelize instance
│   ├── migrate.js       # Migration runner
│   ├── create-migration.js # Migration file generator
│   ├── migrations/      # Migration files
│   └── seeders/        # Seed data files
├── middleware/          # Express middleware
│   └── authUser.js     # Authentication & authorization
├── models/              # Sequelize models (123 files)
│   └── index.js        # Model relationships
├── repository/          # Data access layer (80 files)
├── router/              # API routes (60 files)
├── services/            # Business logic services (59 files)
├── utility/             # Helper functions
│   ├── awsServices.js   # AWS S3 integration
│   ├── dateFormat.js    # Date utilities
│   ├── fileHandler.js   # File operations
│   ├── helper.js        # General helpers
│   ├── s3.js           # S3 configuration
│   ├── semesterGroup.js # Semester utilities
│   └── sendEmail.js     # Email service
├── sql/                 # SQL scripts (8 files)
├── constant.js          # Application constants
├── server.js            # Application entry point
└── package.json         # Dependencies & scripts
```

---

## 🏗️ Architecture

### MVC Pattern with Service Layer

```
Request → Router → Controller → Service → Repository → Model → Database
                ↓
            Response
```

### Layer Responsibilities

1. **Router Layer** (`/router`)
   - Defines API endpoints
   - Handles HTTP methods (GET, POST, PUT, DELETE)
   - Applies middleware (authentication, validation)

2. **Controller Layer** (`/controllers`)
   - Handles HTTP requests/responses
   - Validates input data
   - Calls service layer
   - Returns formatted responses

3. **Service Layer** (`/services`)
   - Contains business logic
   - Orchestrates multiple repository calls
   - Handles complex operations
   - Data transformation

4. **Repository Layer** (`/repository`)
   - Database queries
   - Data access operations
   - Sequelize model interactions

5. **Model Layer** (`/models`)
   - Database schema definitions
   - Sequelize models
   - Relationships between tables

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:8080
```

### Main API Routes

#### Academic Management
- `/acedmicYear` - Academic year management
- `/session` - Session management
- `/course` - Course management
- `/specialization` - Specialization management
- `/semester` - Semester management
- `/subject` - Subject management
- `/classSection` - Class section management
- `/section` - Section management
- `/syllabus` - Syllabus management
- `/lesson` - Lesson management
- `/po` - Program Outcomes
- `/co` - Course Outcomes

#### Student Management
- `/student` - Student CRUD operations
- `/studentInvoice` - Student invoice management
- `/attendance` - Student attendance
- `/examAttendance` - Exam attendance

#### Employee Management
- `/employee` - Employee management
- `/teacher` - Teacher mapping
- `/staff` - Staff management
- `/leavePolicy` - Leave policy
- `/leaveRequest` - Leave requests
- `/leaveBalance` - Leave balance
- `/schedule` - Employee schedules
- `/teacherAttendence` - Teacher attendance

#### Fee Management
- `/feeGroup` - Fee group management
- `/feeType` - Fee type management
- `/feePlan` - Fee plan management
- `/feeInvoice` - Fee invoice
- `/feeInvoiceDetails` - Invoice details
- `/feeInvoiceDetailRecord` - Payment records

#### Library Management
- `/libraryCreation` - Library setup
- `/libraryItem` - Library items/books
- `/libraryMember` - Library members
- `/libraryStructure` - Library structure (floors, aisles, racks)

#### Infrastructure
- `/building` - Building management
- `/floor` - Floor management
- `/classRoom` - Classroom management
- `/head` - Department head management

#### Transport
- `/transportRoute` - Transport routes
- `/vehicle` - Vehicle management
- `/assignVehicle` - Vehicle assignment

#### Dormitory
- `/roomType` - Room type management
- `/dormitoryList` - Dormitory list
- `/addDormitory` - Dormitory assignment

#### Exam Management
- `/examType` - Exam type
- `/examSetup` - Exam setup
- `/examStructure` - Exam structure
- `/examStructureScheduleMapping` - Exam schedule mapping
- `/examSchedule` - Exam schedule

#### Timetable
- `/timeTable` - Timetable management
- `/timeTableCreate` - Timetable creation
- `/faculityLoad` - Faculty workload

#### System Management
- `/user` - User management
- `/role` - Role management
- `/permission` - Permission management
- `/rolePermissionMapping` - Role-permission mapping
- `/userRolePermission` - User role assignment
- `/setting` - System settings
- `/codeMaster` - Code master (lookup tables)
- `/department` - Department management
- `/departmentStructure` - Department hierarchy
- `/subAccount` - Sub-account management
- `/account` - Account management

#### Other
- `/holiday` - Holiday management
- `/notice` - Notice management
- `/electiveSubject` - Elective subjects
- `/download` - File downloads
- `/main` - Main dashboard data

---

## 🔐 Authentication & Authorization

### Authentication Flow
1. User logs in with email/password
2. Server validates credentials
3. JWT token is generated and returned
4. Client includes token in `Authorization` header for subsequent requests

### Authorization Middleware (`middleware/authUser.js`)

**Features:**
- JWT token verification
- Role-based access control (RBAC)
- Permission-based access control
- Route-level authorization

**Token Format:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Access Control:**
- **Read Operations (GET):** Role-based access
- **Write Operations (POST/PUT/DELETE):** Permission-based access
- **Admin Role:** Full access to all routes

### User Roles
- Admin
- Teacher
- Student
- Staff
- Librarian
- Accountant
- Custom roles (configurable)

---

## 💾 Database

### Database System
- **Type:** MySQL
- **ORM:** Sequelize
- **Total Models:** 123
- **Total Relationships:** ~477

### Database Configuration
- **Host:** Configurable via environment variables
- **Database Name:** `university_db` (default)
- **Connection Pool:** Max 5 connections

### Migration System
- Custom migration scripts
- Version-controlled schema changes
- Rollback support

**Commands:**
```bash
npm run migrate          # Run migrations
npm run migrate:down     # Rollback
npm run migrate:status   # Check status
npm run migrate:create   # Create new migration
```

See `DATABASE_DOCUMENTATION.md` for complete database schema.

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server
- npm or pnpm

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd university-erp-be
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure environment variables**
   Create `.env` file:
   ```env
   HOST=localhost
   PORT=8080
   MYSQL_USERNAME=root
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE_NAME=university_db
   MIGRATIONS_ENABLED=false
   ```

4. **Setup database**
   - Create MySQL database
   - Run migrations (if enabled):
     ```bash
     npm run migrate
     ```

5. **Start the server**
   ```bash
   npm start
   # or
   npm run server
   ```

### Available Scripts
```bash
npm start              # Start server with nodemon
npm run server         # Start server with delay
npm run migrate        # Run database migrations
npm run migrate:down   # Rollback migrations
npm run migrate:status # Check migration status
npm run migrate:create # Create new migration
```

---

## 🔧 Environment Variables

### Required Variables
```env
HOST=localhost                    # Database host
MYSQL_USERNAME=root               # Database username
MYSQL_PASSWORD=your_password      # Database password
MYSQL_DATABASE_NAME=university_db # Database name
PORT=8080                         # Server port
```

### Optional Variables
```env
MIGRATIONS_ENABLED=true           # Enable migration mode
AWS_ACCESS_KEY_ID=                # AWS S3 access key
AWS_SECRET_ACCESS_KEY=            # AWS S3 secret key
AWS_BUCKET_NAME=                  # S3 bucket name
EMAIL_HOST=                        # SMTP host
EMAIL_USER=                        # SMTP user
EMAIL_PASS=                        # SMTP password
```

---

## ✨ Features

### 1. Student Management
- Student registration and enrollment
- Student profile management
- Admission tracking
- Academic records
- Fee tracking
- Attendance tracking

### 2. Employee Management
- Employee registration
- Employee profiles
- Qualifications and experience
- Skills and achievements
- Leave management
- Attendance tracking

### 3. Academic Management
- Course management
- Semester management
- Subject management
- Class section management
- Syllabus management
- Lesson planning
- Program/Course Outcomes

### 4. Fee Management
- Fee group and type configuration
- Fee plan creation
- Invoice generation
- Payment tracking
- Payment records
- Fee reports

### 5. Library Management
- Library setup and configuration
- Book/item cataloging
- Library member management
- Book issue/return
- Library structure (floors, aisles, racks, rows)
- Inventory management

### 6. Attendance Management
- Student attendance tracking
- Teacher attendance
- Class-wise attendance
- Subject-wise attendance
- Attendance reports

### 7. Timetable Management
- Timetable creation
- Faculty workload management
- Class scheduling
- Room allocation
- Timetable viewing

### 8. Exam Management
- Exam type configuration
- Exam setup
- Exam structure
- Exam schedule
- Exam attendance
- Result management

### 9. Transport Management
- Route management
- Vehicle management
- Vehicle assignment
- Route tracking

### 10. Dormitory Management
- Room type management
- Dormitory assignment
- Room allocation

### 11. Infrastructure Management
- Building management
- Floor management
- Classroom management
- Department head management

### 12. System Administration
- User management
- Role management
- Permission management
- System settings
- Code master (lookup tables)
- Department structure

---

## 📊 Statistics

- **Total Controllers:** 60
- **Total Services:** 59
- **Total Repositories:** 80
- **Total Routes:** 60
- **Total Models:** 123
- **Total Relationships:** ~477

---

## 🔄 Data Flow

1. **Client Request** → Express Router
2. **Router** → Authentication Middleware
3. **Middleware** → Controller
4. **Controller** → Service Layer
5. **Service** → Repository Layer
6. **Repository** → Sequelize Model
7. **Model** → MySQL Database
8. **Response** ← (reverse flow)

---

## 📝 Code Standards

- **ES Modules:** All files use ES6 import/export
- **Async/Await:** Asynchronous operations use async/await
- **Error Handling:** Try-catch blocks in all async functions
- **Naming Convention:** camelCase for variables, PascalCase for classes
- **File Naming:** camelCase for files (e.g., `userController.js`)

---

## 🛡️ Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Permission-based authorization
- SQL injection prevention (Sequelize ORM)
- CORS configuration
- Input validation

---

## 📦 File Upload

- **Local Upload:** express-fileupload
- **Cloud Upload:** AWS S3 (multer-s3)
- **Supported Formats:** Images, Documents, CSV, Excel
- **File Storage:** Configurable (local or S3)

---

## 📧 Email Service

- **Provider:** Nodemailer
- **Features:** 
  - Email notifications
  - Password reset
  - System notifications
  - Custom email templates

---

## 🔍 Utilities

- **Date Formatting:** moment.js
- **File Processing:** csv-parser, xlsx
- **UUID Generation:** uuid
- **Helper Functions:** Custom utility functions

---

## 📚 Additional Resources

- **Database Documentation:** See `DATABASE_DOCUMENTATION.md`
- **Migration Guide:** See `MIGRATIONS.md`
 **Seeder Guide:** See `Seeder.md`
- **SQL Scripts:** See `/sql` directory

---

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check database credentials in `.env`
   - Ensure MySQL server is running
   - Verify database exists

2. **Migration Errors**
   - Check migration status: `npm run migrate:status`
   - Rollback if needed: `npm run migrate:down`
   - Verify database connection

3. **Authentication Errors**
   - Verify JWT token in request header
   - Check token expiration
   - Verify user permissions

4. **Port Already in Use**
   - Change PORT in `.env`
   - Kill process using port 8080

---



For issues or questions, refer to:
- Project documentation
- Database documentation
- Code comments
- Migration guide

---

**Last Updated:** 30-11-2025
**Version:** 1.0.0
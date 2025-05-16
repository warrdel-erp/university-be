import { checkEmail, checkEnroll } from '../repository/studentRepository.js';
import * as studentService from '../services/studentService.js'
import * as fileHandler from '../utility/fileHandler.js';
// 1. create student

export const addStudent = async (req, res) => {
    const file = req.files;
    const createdBy = req.user.userId;
    let { universityId, campusId, instituteId, affiliatedUniversityId, courseLevelId, courseId, email, enrollNumber,roleId,classSectionId,acedmicYearId} = req.body;

    try {
        // Check for required fields
        if (!(universityId && campusId && instituteId && affiliatedUniversityId && courseLevelId && courseId && roleId && classSectionId && acedmicYearId)) {
            return res.status(400).send("universityId, campusId, instituteId, affiliatedUniversityId, courseLevelId, roleId, courseId,acedmicYearId and classSectionId are required");
        }

        // Check if email already exists
        if (email) {
            const checkExistingEmail = await checkEmail(email);
            if (checkExistingEmail) {
                if (email.toLowerCase() === checkExistingEmail.dataValues.email.toLowerCase()) {
                    return res.status(400).send("Email is already existing");
                }
            }
        } else {
            return res.status(400).send("Email is required");
        }

        // Check if enrollment number already exists
        if (enrollNumber) {
            const checkExistingEnroll = await checkEnroll(enrollNumber);
            if (checkExistingEnroll) {
                if (enrollNumber.toLowerCase() === checkExistingEnroll.dataValues.enroll_number.toLowerCase()) {
                    return res.status(400).send("Enrollment number is already existing");
                }
            }
        }

        // Add the student
        const info = req.body;
        const result = await studentService.addStudent(info, file,createdBy,universityId,roleId,acedmicYearId,classSectionId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in addStudent:", error);
        return res.status(500).send("Internal Server Error");
    }
};

// 2. get all student
export const getAllStudents = async (req, res) => {
    const universityId = req.user.universityId;
    let { search, acedmicYearId, page, limit } = req.query;
    
    search = search || 'all';
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    try {
        const result = await studentService.getAllStudents(search, universityId, acedmicYearId, page, limit);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting all student details:", error);
        res.status(500).send("Internal Server Error");
    }
};


// 3. get single student details
export const getSingleStudentDetail = async (req,res) => {
    const universityId = req.user.universityId;
    const studentId = req.query.studentId;
    try {
        if (!studentId){
            res.status(400).send("studentId is required");
        }
        const result = await studentService.getSingleStudentDetail(studentId,universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in getting ${studentId} details , single student details:`, error);
        res.status(500).send("Internal Server Error");
    }
};

// import student data

export const importStudentData = async (req, res) => {
    try {
      const { campusId, instituteId, affiliatedUniversityId, acedmicYearId } = req.body;
      const universityId = req.user.universityId;    
      const createdBy = req.user.userId;
      const data = { ...req.body, universityId, createdBy }; 
  
      if (!(campusId && instituteId && affiliatedUniversityId && acedmicYearId)) {
        return res.status(400).send('campusId, instituteId, affiliatedUniversityId, and acedmicYearId are required');
      }
  
      const excelFile = req.files?.student;
      if (!excelFile) {
        return res.status(400).send('Excel file is required');
      }
  
      const excelData = fileHandler.readExcelFile(excelFile.data);
      if (!excelData) {
        return res.status(400).send('Error reading the Excel file');
      }
  
      const result = await studentService.importStudentData(excelData, data);
      if (!result) {
        return res.status(400).send('Error processing the Excel data');
      }
  
      res.status(200).send({ message: 'Data imported successfully' });
    } catch (error) {
      console.error(error); 
      res.status(500).send({ error: error.message || 'An unexpected error occurred' });
    }
};
  
// update student 
export const updateStudentDetails = async (req,res) => {
    const {studentId,universityId,campusId,instituteId,affiliatedUniversityId,courseLevelId,courseId} = req.body;
    const info = req.body;
    const file = req.files;  
    try {
        if (!(studentId && universityId && campusId && instituteId && affiliatedUniversityId && courseLevelId && courseId )){
            res.status(400).send("student Id,universityId,campusId,instituteId,affiliatedUniversityId,courseLevelId and courseId is required");
        }
        const result = await studentService.updateStudentDetails(studentId, info,file);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in updating student Id ${studentId} and ${campusId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const deleteStudentDetail = async (req,res) => {
    const {studentId} = req.params;
    try {
        if (!studentId){
            res.status(400).send("student Id is required");
        }else{
            const result = await studentService.deleteStudentDetail(studentId);
            res.status(200).send(result);
        }
    } catch (error) {
        console.error(`Error in deleting student Id ${studentId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const getEmptyEnrollNumber = async (req,res) => {
    const universityId = req.user.universityId;
    const {acedmicYearId} = req.query
    try {
        const result = await studentService.getEmptyEnrollNumber(universityId,acedmicYearId);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in getting EMpty Enroll Number:`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const studentCourseMapping = async (req, res) => {
    let { subjectId, studentId, courseId, semesterId} = req.body;
    const data = req.body
    try {
        // required fields
        if (!( subjectId && studentId && courseId && semesterId)) {
            return res.status(400).send(" subjectId, studentId, courseId, semesterId is required");
        }

        // Add the student course mapping
        const info = req.body;
        const result = await studentService.studentCourseMapping(data);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in student course mapping:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const classStudentMapping = async (req, res) => {
    let { studentId, classSectionId} = req.body;
    const data = req.body
    const createdBy = req.user.userId;
    try {
        //  required fields
        if (!( studentId && classSectionId)) {
            return res.status(400).send(" studentId, classSectionId is required");
        }

        const info = req.body;
        const result = await studentService.classStudentMapping(data, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in class Student Mapping:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getclassStudentMapping = async (req, res) => {
    const universityId = req.user.universityId;
    const classSectionId = req.query.classSectionId || 0;   
    const acedmicYearId = req.query.acedmicYearId 
    try {
        const result = await studentService.getclassStudentMapping(classSectionId,universityId,acedmicYearId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class Student Mapping:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addElectiveSubject = async (req, res) => {
    let { studentId, electiveSubjectId} = req.body;
    const data = req.body
    const createdBy = req.user.userId;
    try {
        //  required fields
        if (!( studentId && electiveSubjectId)) {
            return res.status(400).send(" electiveSubjectId, studentId is required");
        }

        const result = await studentService.addElectiveSubject(data,createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in student add Elective Subject:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const promoteStudent = async (req, res) => {
    const data = req.body;    
    try {

        if (Array.isArray(data)) {
            const results = [];
            for (const student of data) {
                if (!(student.studentId && student.classSectionId)) {
                    return res.status(400).send("Both classSectionId and studentId are required for all students.");
                }
                const result = await studentService.promoteStudent(student);
                results.push(result);
            }
            return res.status(200).json(results);
        }

        const result = await studentService.promoteStudent(data);
        return res.status(200).json(result);

    } catch (error) {
        console.error("Error in promoteStudent:", error);
        return res.status(500).send("Internal Server Error: " + error.message);
    }
};

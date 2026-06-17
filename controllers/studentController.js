import * as studentService from '../services/studentService.js'
import * as fileHandler from '../utility/fileHandler.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';
export const addStudentWithFeePlanProfile = async (req, res) => {
    try {
        const result = await studentService.addStudentWithFeePlanProfile({
            info: req.body,
            files: req.files,
            createdBy: req.user.userId,
        });
        return SuccessResponse(res, 201, "Student created successfully", result);
    } catch (error) {
        console.error("Error in addStudentWithFeePlanProfile:", error);
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
};

// 2. get all student
export const getAllStudents = async (req, res) => {
    const { page, limit, search, courseId } = req.query;

    try {
        const result = await studentService.getAllStudents({
            page,
            limit,
            search,
            courseId,
        });
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting all student details:", error);
        res.status(500).send("Internal Server Error");
    }
};


// 3. get single student details
export const getSingleStudentDetail = async (req, res) => {
    const { studentId } = req.query;
    try {
        const result = await studentService.getSingleStudentDetail(studentId);
        if (!result) {
            return res.status(404).send("Student not found");
        }
        return res.status(200).send(result);
    } catch (error) {
        console.error(`Error in getting ${studentId} details , single student details:`, error);
        res.status(500).send("Internal Server Error");
    }
};

// import student data

export const importStudentData = async (req, res) => {
    try {
        const { campusId, instituteId, affiliatedUniversityId, sessionId } = req.body;
        const universityId = req.user.universityId;
        const createdBy = req.user.userId;
        const data = { ...req.body, universityId, createdBy };

        if (!(campusId && instituteId && affiliatedUniversityId && sessionId)) {
            return res.status(400).send('campusId, instituteId, affiliatedUniversityId, and sessionId are required');
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
export const updateStudentDetails = async (req, res) => {
    const studentId = Number(req.params.studentId);
    const info = req.body;
    const file = req.files;
    try {
        if (!studentId) {
            return ErrorResponse(res, 400, "studentId in URL path is required");
        }
        const result = await studentService.updateStudentDetails(
            studentId,
            info,
            file,
            req.user.defaultInstituteId,
            req.user.userId,
        );
        return SuccessResponse(res, 200, "Student updated successfully", result);
    } catch (error) {
        console.error(`Error in updating student Id ${studentId}:`, error);
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
};

export const deleteStudentDetail = async (req, res) => {
    const { studentId } = req.params;
    try {
        if (!studentId) {
            res.status(400).send("student Id is required");
        } else {
            const result = await studentService.deleteStudentDetail(studentId);
            res.status(200).send(result);
        }
    } catch (error) {
        console.error(`Error in deleting student Id ${studentId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const getEmptyEnrollNumber = async (req, res) => {
    const { acedmicYearId } = req.query;
    try {
        const result = await studentService.getEmptyEnrollNumber(acedmicYearId);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in getting EMpty Enroll Number:`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const studentCourseMapping = async (req, res) => {
    let { subjectId, studentId, courseId, semesterId } = req.body;
    const data = req.body
    try {
        // required fields
        if (!(subjectId && studentId && courseId && semesterId)) {
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
    let { studentId, classSectionId } = req.body;
    const data = req.body
    const createdBy = req.user.userId;
    try {
        //  required fields
        if (!(studentId && classSectionId)) {
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
    const semesterId = req.query.semesterId || 0;
    const acedmicYearId = req.query.acedmicYearId;

    try {
        const result = await studentService.getclassStudentMapping(semesterId, acedmicYearId);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting class Student Mapping:", error);
        return res.status(500).send("Internal Server Error");
    }
};

export const addElectiveSubject = async (req, res) => {
    let { studentId, electiveSubjectId } = req.body;
    const data = req.body
    const createdBy = req.user.userId;
    try {
        //  required fields
        if (!(studentId && electiveSubjectId)) {
            return res.status(400).send(" electiveSubjectId, studentId is required");
        }

        const result = await studentService.addElectiveSubject(data, createdBy);
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
                if (!(student.studentId && student.semesterId)) {
                    return res.status(400).send("Both semesterId and studentId are required for all students.");
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

export const getFeePlanInitiate = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await studentService.getFeePlanInitiateAll({ page, limit });
        return SuccessResponse(
            res,
            200,
            "Fee plan initiate data fetched successfully",
            { students: result.students },
            result.pagination
        );
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
};

export const getEmptyFeeDetails = async (req, res) => {
    const { acedmicYearId, courseId, sessionId } = req.query;
    try {
        const result = await studentService.getEmptyFeeDetails({ acedmicYearId, courseId, sessionId });
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in getting empty fee details:`, error);
        res.status(error.statusCode || 500).send(error.message || "Internal Server Error");
    }
};

export const getStudentSubject = async (req, res) => {
    const { studentId } = req.params;
    try {
        if (!studentId) {
            res.status(400).send("student Id is required");
        } else {
            const result = await studentService.getStudentSubject(studentId);
            res.status(200).send(result);
        }
    } catch (error) {
        console.error(`Error in student subject student Id ${studentId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const getFeeDetailsByStudentId = async (req, res) => {
    const { studentId } = req.params;
    try {
        if (!studentId) {
            res.status(400).send("student Id is required");
        } else {
            const result = await studentService.getFeeDetailsByStudentId(studentId);
            res.status(200).send(result);
        }
    } catch (error) {
        console.error(`Error in student fee details ${studentId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};

export async function getBooksIssuedToStudent(req, res) {
    try {
        const { studentId } = req.query;

        if (!studentId) {
            return res.status(400).json({ message: "studentId is required" });
        }

        const result = await studentService.getBooksIssuedToStudent(studentId);
        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getStudentTimeTable = async (req, res) => {
    try {
        const { studentId } = req.query;

        if (!studentId) {
            return res.status(400).send("studentId is required");
        }

        const result = await studentService.getStudentTimeTable(studentId);

        return res.status(200).send(result);

    } catch (error) {
        console.error("Error in getStudentTimeTable:", error);
        res.status(500).send("Internal Server Error");
    }
};



export async function getStudentsByClassSection(req, res) {

    try {

        const { timeTableMappingId, academicYearId, date } = req.query;

        const students = await studentService.getStudentsByClassSection(
            timeTableMappingId,
            academicYearId,
            date
        );

        return res.status(200).json({
            success: true,
            count: students.length,
            data: students
        });

    } catch (error) {

        console.error("Controller Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

}


export const getAllAnswerSheets = async (req, res) => {
    try {
        const { examScheduleId } = req.query;

        const result = await studentService.getAllAnswerSheets({
            examScheduleId,
        });

        return res.status(200).json({
            success: true,
            message: "Answer sheets fetched successfully",
            data: result
        });
    } catch (error) {
        console.error("Error in getAllAnswerSheets:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
            error: error.message
        });
    }
};
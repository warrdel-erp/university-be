import * as studentService from '../services/studentService.js'
import * as fileHandler from '../utility/fileHandler.js';
import { SuccessResponse, ErrorResponse } from '../utility/response.js';
import { getAcademicYearId } from '../utility/requestContext.js';
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
    const studentId = req.params.studentId ?? req.query.studentId;
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
        const createdBy = req.user.userId;
        const universityId = req.body.universityId ?? req.user.universityId;
        const data = { ...req.body, createdBy, universityId };

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

        res.status(200).send({ message: 'Data imported successfully', ...result });
    } catch (error) {
        console.error(error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).send({ error: error.message || 'An unexpected error occurred' });
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
    const { page, limit, search } = req.query;
    try {
        const result = await studentService.getEmptyEnrollNumber(getAcademicYearId(), {
            page,
            limit,
            search,
        });
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in getting EMpty Enroll Number:`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const studentCourseMapping = async (req, res) => {
    const { subjectId, studentId, courseId, classSectionTermId } = req.body;
    const data = req.body;
    try {
        if (!(subjectId && studentId && courseId)) {
            return res.status(400).send("subjectId, studentId, courseId is required");
        }

        if (classSectionTermId != null) {
            data.classSectionTermId = Number(classSectionTermId);
        }

        const result = await studentService.studentCourseMapping(data);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in student course mapping:", error);
        if (error.message === 'classSectionTermId could not be resolved') {
            return res.status(400).send(error.message);
        }
        return res.status(500).send("Internal Server Error");
    }
};

export const sectionStudentMapping = async (req, res) => {
    const { studentId, classSectionTermId } = req.body;
    const data = req.body;
    const createdBy = req.user.userId;
    try {
        if (!(studentId && classSectionTermId)) {
            return res.status(400).send("studentId and classSectionTermId are required");
        }

        const result = await studentService.sectionStudentMapping(data, createdBy);
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in section student mapping:", error);
        return res.status(error.statusCode || 500).json({ error: error.message || "Internal Server Error" });
    }
};

export const getSectionStudentMapping = async (req, res) => {
    const classSectionTermId = req.query.classSectionTermId ?? 0;
    const term = req.query.term != null ? Number(req.query.term) : undefined;
    const { page, limit, search } = req.query;

    try {
        const result = await studentService.getSectionStudentMapping(
            classSectionTermId,
            undefined,
            term,
            { page, limit, search },
        );
        return res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting section student mapping:", error);
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
    const createdBy = req.user.userId;

    try {
        const promoteOne = async (payload) => {
            if (!(payload.studentId && payload.classSectionTermId)) {
                const error = new Error(
                    "studentId and classSectionTermId are required for all students.",
                );
                error.statusCode = 400;
                throw error;
            }
            return studentService.promoteStudent({ ...payload, createdBy });
        };

        if (Array.isArray(data)) {
            const results = [];
            for (const student of data) {
                results.push(await promoteOne(student));
            }
            return res.status(200).json(results);
        }

        const result = await promoteOne(data);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error in promoteStudent:", error);
        const statusCode = error.statusCode || 500;
        return res
            .status(statusCode)
            .json({ error: error.message || "Internal Server Error" });
    }
};

export const getPromotionAvailableSection = async (req, res) => {
    try {
        const { courseId, term, classSectionTermId } = req.query;

        const data = await studentService.getAvailablePromotionSections({
            courseId,
            term,
            classSectionTermId,
        });

        const message = data.finalTerm
            ? "Final term reached"
            : "Promotion class sections fetched successfully";

        return SuccessResponse(res, 200, message, data);
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
};

export const getPromotionStudentList = async (req, res) => {
    try {
        const { page, limit, programCourseId, studentSearch, promotionTerm } = req.query;
        const result = await studentService.getPromotionStudentList({
            page,
            limit,
            courseId: programCourseId,
            search: studentSearch,
            term: promotionTerm,
        });

        return SuccessResponse(
            res,
            200,
            "Promotion student list fetched successfully",
            { promotionStudents: result.promotionStudents },
            result.pagination,
        );
    } catch (error) {
        console.error("Error in getPromotionStudentList:", error);
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
};

export const getStudentPromotionHistory = async (req, res) => {
    try {
        const result = await studentService.getPromotionHistory(req.query);
        const message = req.query.studentId
            ? "Student promotion history fetched successfully"
            : "Promotion student list fetched successfully";
        return SuccessResponse(res, 200, message, result.data, result.pagination);
    } catch (error) {
        console.error("Error in getStudentPromotionHistory:", error);
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
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

export const getStudentsByFeePlanList = async (req, res) => {
    try {
        const { courseId, year, term, feePlanProfileId, page, limit } = req.query;
        const result = await studentService.getStudentsByFeePlanList({
            courseId,
            year,
            term,
            feePlanProfileId,
            academicYearId: getAcademicYearId(),
            page,
            limit,
        });
        return SuccessResponse(
            res,
            200,
            "Fee plan students fetched successfully",
            {
                students: result.students,
            },
            result.pagination,
        );
    } catch (error) {
        return ErrorResponse(res, error.statusCode || 500, error.message || "Internal Server Error");
    }
};

export const getEmptyFeeDetails = async (req, res) => {
    const { courseId, sessionId, year, search, page, limit } = req.query;
    try {
        const result = await studentService.getEmptyFeeDetails({
            academicYearId: getAcademicYearId(),
            courseId,
            sessionId,
            year,
            search,
            page,
            limit,
        });
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
        const { timeTableMappingId, date } = req.query;

        const result = await studentService.getStudentsByClassSection({
            timeTableMappingId,
            date,
        });

        const students = result.students ?? [];

        return res.status(200).json({
            success: true,
            count: students.length,
            data: result,
        });
    } catch (error) {
        console.error("Controller Error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
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
import * as timeTableCreateServices from '../services/timeTableCreateServices.js';

export const addtimeTableCreate = async (req, res) => {
    try {
        const data = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableCreateServices.addtimeTableCreate(data, createdBy, updatedBy);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in adding time table create :", error);
        const message = error.message || 'Internal Server Error';
        const statusCode = /required|not found|does not match|could not be resolved|overlap/i.test(message) ? 400 : 500;
        res.status(statusCode).send(message);
    }
};

export const cloneTimeTableRoutine = async (req, res) => {
    const { previousRoutineId, startingDate, endingDate } = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        const result = await timeTableCreateServices.cloneTimeTableRoutine(
            previousRoutineId,
            startingDate,
            endingDate,
            createdBy,
            updatedBy
        );
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in cloning time table routine:", error);
        res.status(500).send({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const gettimeTableCreateDetails = async (req, res) => {
    try {
        const { courseId, sessionId } = req.query;
        const result = await timeTableCreateServices.gettimeTableCreateDetails({
            courseId,
            sessionId,
        });
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSingletimeTableCreateDetails = async (req, res) => {
    const { courseId } = req.query;
    try {
        const result = await timeTableCreateServices.getSingletimeTableCreateDetails(courseId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting single time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getTimeTableByCourseAndSection = async (req, res) => {
    const { courseId, classSectionTermId, timeTableType } = req.query;
    try {
        const result = await timeTableCreateServices.getTimeTableByCourseAndSection(
            courseId,
            classSectionTermId,
            timeTableType,
        );
        res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching timetable:", error);
        const statusCode = /not found|could not be resolved/.test(error.message) ? 400 : 500;
        res.status(statusCode).send(error.message || "Internal Server Error");
    }
};

export const addtimeTableMapping = async (req, res) => {
    try {
        const data = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableCreateServices.addtimeTableMapping(
            data,
            createdBy,
            updatedBy
        );
        res.status(200).send(result);
    } catch (error) {
        res.status(400).send({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};

export const getTimeTableMappingDetail = async (req, res) => {
    const { timeTableRoutineId } = req.body;
    try {
        const result = await timeTableCreateServices.getTimeTableMappingDetail(timeTableRoutineId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSingletimeTableMappingDetail = async (req, res) => {
    const { courseId } = req.query;
    try {
        const result = await timeTableCreateServices.getSingletimeTableMappingDetail(courseId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting single time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const changeTimeTableCreate = async (req, res) => {
    const updatedBy = req.user.userId;
    try {
        const result = await timeTableCreateServices.changeTimeTableCreate(req.body, updatedBy);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in updating time table create`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const updatetimeTableCreate = async (req, res) => {
    const { timeTableType, timeTableMappingId } = req.body;
    const updatedBy = req.user.userId;
    try {
        const result = await timeTableCreateServices.updatetimeTableCreate(timeTableMappingId, timeTableType, updatedBy);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in updating time table type`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const updateSimpleTeacherMappingController = async (req, res) => {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableCreateServices.updateSimpleTeacherMapping(
            req.body,
            createdBy,
            updatedBy
        );
        res.status(200).send(result);
    } catch (err) {
        console.error("Error in updateSimpleTeacherMappingController:", err);
        res.status(500).send({ success: false, message: err.message });
    }
};

export const deletetimeTableMapping = async (req, res) => {
    const { timeTableMappingId, deleteCombinedGroup } = req.query;
    try {
        const result = await timeTableCreateServices.deletetimeTableMapping(timeTableMappingId, {
            deleteCombinedGroup: deleteCombinedGroup === true || deleteCombinedGroup === 'true',
        });
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in deleting time table mapping Id ${timeTableMappingId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const getTimeTableCellData = async (req, res) => {
    const { courseId, classSectionTermId } = req.query;
    try {
        const result = await timeTableCreateServices.getTimeTableCellData(courseId, classSectionTermId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table cell data:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getTimeTableElective = async (req, res) => {
    const { courseId } = req.query;
    try {
        const result = await timeTableCreateServices.getTimeTableElective(courseId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table cell data:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const publishTimeTable = async (req, res) => {
    try {
        const { timeTableRoutineId } = req.query;
        const response = await timeTableCreateServices.publishTimeTableService(timeTableRoutineId);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

export const ClassSubjectCount = async (req, res) => {
    try {
        const { classSectionTermId } = req.query;
        const response = await timeTableCreateServices.getSubjectWithCount(classSectionTermId);
        res.status(200).send(response);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

export const getRoutineByClassSectionId = async (req, res) => {
    const { classSectionTermId } = req.query;
    try {
        const result = await timeTableCreateServices.getRoutineByClassSectionId(classSectionTermId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting routine by class section id:", error);
        res.status(500).send({ message: "Internal Server Error", error: error.message });
    }
};

export const getRoutineByTeacherAndAcademicYear = async (req, res) => {
    const { employeeId, courseId, sessionId } = req.query;
    try {
        const result = await timeTableCreateServices.getRoutineByTeacherAndAcademicYear(
            employeeId,
            courseId,
            sessionId,
        );
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting routine by teacher and academic year:", error);
        res.status(500).send("Internal Server Error");
    }
};

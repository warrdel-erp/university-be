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
        res.status(500).send("Internal Server Error");
    }
};

export const gettimeTableCreateDetails = async (req, res) => {
    const universityId = req.user.universityId;
    try {
        const result = await timeTableCreateServices.gettimeTableCreateDetails(universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSingletimeTableCreateDetails = async (req, res) => {
    const universityId = req.user.universityId;
    let { courseId } = req.query
    try {
        const result = await timeTableCreateServices.getSingletimeTableCreateDetails(courseId, universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting single time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getTimeTableByCourseAndSection = async (req, res) => {
    const { courseId, classSectionsId, timeTableType } = req.query;
    const { universityId } = req.user;

    if (!courseId) {
        return res.status(400).send("courseId is required");
    }

    try {
        const result =
            await timeTableCreateServices.getTimeTableByCourseAndSection(
                courseId,
                classSectionsId,
                universityId,
                timeTableType
            );

        res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching timetable:", error);
        res.status(500).send("Internal Server Error");
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
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role;
    const timeTableRoutineId = req.body.timeTableRoutineId;

    if (!universityId) {
        return res.status(400).json({
            status: "error",
            message: "University Id is missing from user session",
        });
    }
    try {
        const result = await timeTableCreateServices.getTimeTableMappingDetail(universityId, instituteId, timeTableRoutineId, role);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSingletimeTableMappingDetail = async (req, res) => {
    const universityId = req.user.universityId;
    let { courseId } = req.query
    try {
        const result = await timeTableCreateServices.getSingletimeTableMappingDetail(courseId, universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting single time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

// change time table 
export const changeTimeTableCreate = async (req, res) => {
    const { timeTableRoutineId } = req.body
    const updatedBy = req.user.userId;
    try {
        if (!timeTableRoutineId) {
            return res.status(400).send("timeTableRoutineId is required for each object.");
        }

        const result = await timeTableCreateServices.changeTimeTableCreate(req.body, updatedBy);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in updating time table create`, error);
        res.status(500).send("Internal Server Error");
    }
};

// update time table 
export const updatetimeTableCreate = async (req, res) => {
    const { timeTableType, timeTableMappingId } = req.body
    const updatedBy = req.user.userId;
    try {
        if (!(timeTableType && timeTableMappingId)) {
            return res.status(400).send("timeTableType and timeTableMappingId are required for each object.");
        }

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

        const data = req.body;

        const result = await timeTableCreateServices.updateSimpleTeacherMapping(
            data,
            createdBy,
            updatedBy
        );

        res.status(200).send(result);

    } catch (err) {
        console.error("Error in updateSimpleTeacherMappingController:", err);
        res.status(500).send({ success: false, message: err.message });
    }
};

// // update time table 
// export const updateFaculityLoad = async (req,res) => {
//     const info = req.body;   
//     const {timeTableRoutineId,employeeId}= req.body
//     const updatedBy = req.user.userId;
//     try {
//             if (!(timeTableRoutineId && employeeId)) {
//                 return res.status(400).send("Both timeTableRoutineId and employeeId are required for each object.");
//             }

//         const result = await timeTableCreateServices.updateFaculityLoad(timeTableRoutineId,req.body,updatedBy);
//         res.status(200).send(result);
//     } catch (error) {
//         console.error(`Error in updating faculity load`, error);
//         res.status(500).send("Internal Server Error");
//     }
// };

// delete time table

export const deletetimeTableMapping = async (req, res) => {
    const { timeTableMappingId } = req.query;
    try {
        if (!timeTableMappingId) {
            res.status(400).send("time table mapping id is required");
        } else {
            const result = await timeTableCreateServices.deletetimeTableMapping(timeTableMappingId);
            res.status(200).send(result);
        }
    } catch (error) {
        console.error(`Error in deleting time table mapping Id ${timeTableMappingId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};

export const getTimeTableCellData = async (req, res) => {
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role;
    const { courseId, classSectionsId } = req.query
    if (!(courseId)) {
        return res.status(400).send("courseId  is required");
    }
    try {
        const result = await timeTableCreateServices.getTimeTableCellData(courseId, classSectionsId, universityId, instituteId, role);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table cell data:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getTimeTableElective = async (req, res) => {
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role;
    const { courseId } = req.query
    if (!(courseId)) {
        return res.status(400).send("courseId  is required");
    }
    try {
        const result = await timeTableCreateServices.getTimeTableElective(courseId, universityId, instituteId, role);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table cell data:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const publishTimeTable = async (req, res) => {
    try {
        const { timeTableRoutineId } = req.query;

        if (!timeTableRoutineId) {
            return res.status(400).send("timeTableRoutineId is required");
        }

        const response = await timeTableCreateServices.publishTimeTableService(timeTableRoutineId);

        res.status(200).send(response);

    } catch (error) {
        res.status(500).send(error.message);
    }
};

export const ClassSubjectCount = async (req, res) => {
    try {
        const { classSectionsId } = req.query;

        if (!classSectionsId) {
            return res.status(400).send("classSectionsId is required");
        }

        const response = await timeTableCreateServices.getSubjectWithCount(classSectionsId);

        res.status(200).send(response);

    } catch (error) {
        res.status(500).send(error.message);
    }
};

export const getRoutineByClassSectionId = async (req, res) => {
    const { classSectionsId } = req.query;
    if (!classSectionsId) {
        return res.status(400).send("classSectionsId is required");
    }
    try {
        const result = await timeTableCreateServices.getRoutineByClassSectionId(classSectionsId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting routine by class section id:", error);
        res.status(500).send("Internal Server Error");
    }
};
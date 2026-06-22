import * as timeTableServices from '../services/timeTableServices.js';



export const addTimeTable = async (req, res) => {

    try {

        const data = req.body;

        const createdBy = req.user.userId;

        const updatedBy = req.user.userId;

        const universityId = req.user.universityId;

        const instituteId = req.user.defaultInstituteId;

        const acedmicYearId = req.body.acedmicYearId || req.user.defaultAcademicYearId;



        if (data.courseId && !(data.sessionId || acedmicYearId)) {

            return res.status(400).send('sessionId or acedmicYearId is required when courseId is provided');

        }



        const result = await timeTableServices.addTimeTable(

            data,

            createdBy,

            updatedBy,

            universityId,

            instituteId,

            acedmicYearId

        );

        res.status(200).send(result);

    } catch (error) {

        console.error("Error in adding all time table:", error);

        res.status(error.message?.includes('not found') || error.message?.includes('not mapped') ? 400 : 500)

            .send(error.message || "Internal Server Error");

    }

};



export const getTimeTableDetails = async (req, res) => {
    const { courseId } = req.query;

    try {
        const result = await timeTableServices.getTimeTableDetails(courseId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table:", error);
        res.status(500).send("Internal Server Error");
    }
};



export const getAllTimeTableName = async (req, res) => {
    const { courseId, sessionId } = req.query;

    try {
        const result = await timeTableServices.getAllTimeTableName(courseId, sessionId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table structure:", error);
        res.status(500).send("Internal Server Error");
    }
};



export const getSingleTimeTableDetails = async (req, res) => {
    const { courseId, sessionId } = req.query;

    try {
        const result = await timeTableServices.getSingleTimeTableDetails(courseId, sessionId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table:", error);
        res.status(500).send("Internal Server Error");
    }
};



export const updateTimeTable = async (req, res) => {

    const info = req.body;

    try {

        for (const item of info) {

            const { timeTableCreationId } = item;

            if (!timeTableCreationId) {

                return res.status(400).send("timeTableCreationId is required for each object.");

            }

        }

        const result = await timeTableServices.updateTimeTable(req.body);

        res.status(200).send(result);

    } catch (error) {

        console.error(`Error in updating time table`, error);

        res.status(500).send("Internal Server Error");

    }

};



export const deleteTimeTable = async (req, res) => {

    const { timeTableCreationId } = req.query;

    try {

        if (!timeTableCreationId) {

            res.status(400).send("timeTableCreationId is required");

        } else {

            const result = await timeTableServices.deleteTimeTable(timeTableCreationId);

            res.status(200).send(result);

        }

    } catch (error) {

        console.error(`Error in deleting time table Id ${timeTableCreationId}:`, error);

        res.status(500).send("Internal Server Error");

    }

};


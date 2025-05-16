import * as timeTableServices  from '../services/timeTableServices.js';

export const addTimeTable = async (req,res) => {
    try {
        const data = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        // const {courseId} = req.body;
        // if(!courseId){
        //   return res.status(400).send('courseId is required')
        // }
        const result = await timeTableServices.addTimeTable(data,createdBy,updatedBy);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in adding all time table:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getTimeTableDetails = async (req,res) => {
    const universityId = req.user.universityId;
    // const{}
    try {
        const result = await timeTableServices.getTimeTableDetails(universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSingleTimeTableDetails = async (req,res) => {
    const universityId = req.user.universityId;
    let {courseId} = req.query
    try {
        const result = await timeTableServices.getSingleTimeTableDetails(courseId,universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table:", error);
        res.status(500).send("Internal Server Error");
    }
};

// update time table 
export const updateTimeTable = async (req,res) => {
    const info = req.body;    
    try {
        for (const item of info) {
            const { timeTableCreationId } = item;

            if (!(timeTableCreationId )) {
                return res.status(400).send(" timeTableCreationId is required for each object.");
            }
        }
        const result = await timeTableServices.updateTimeTable(req.body);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in updating time table`, error);
        res.status(500).send("Internal Server Error");
    }
};

// delete time table

export const deleteTimeTable = async (req,res) => {
    const {timeTableCreationId} = req.query;
    try {
        if (!timeTableCreationId){
            res.status(400).send("time Table Creation Id is required");
        }else{
            const result = await timeTableServices.deleteTimeTable(timeTableCreationId);
            res.status(200).send(result);
        }
    } catch (error) {
        console.error(`Error in deleting time table Id ${timeTableCreationId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};
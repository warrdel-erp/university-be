import * as timeTableCreateServices  from '../services/timeTableCreateServices.js';

export const addtimeTableCreate = async (req,res) => {
    try {
        const data = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableCreateServices.addtimeTableCreate(data,createdBy,updatedBy);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in adding time table create :", error);
        res.status(500).send("Internal Server Error");
    }
};

export const gettimeTableCreateDetails = async (req,res) => {
    const universityId = req.user.universityId;
    try {
        const result = await timeTableCreateServices.gettimeTableCreateDetails(universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSingletimeTableCreateDetails = async (req,res) => {
    const universityId = req.user.universityId;
    let {courseId} = req.query
    try {
        const result = await timeTableCreateServices.getSingletimeTableCreateDetails(courseId,universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting single time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addtimeTableMapping = async (req,res) => {
    try {
        const data = req.body;        
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await timeTableCreateServices.addtimeTableMapping(data,createdBy,updatedBy);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in adding time table create :", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getTimeTableMappingDetail = async (req,res) => {
    const universityId = req.user.universityId;
    try {
        const result = await timeTableCreateServices.getTimeTableMappingDetail(universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSingletimeTableMappingDetail = async (req,res) => {
    const universityId = req.user.universityId;
    let {courseId} = req.query
    try {
        const result = await timeTableCreateServices.getSingletimeTableMappingDetail(courseId,universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting single time table create:", error);
        res.status(500).send("Internal Server Error");
    }
};

// // update time table 
// export const updateFaculityLoad = async (req,res) => {
//     const info = req.body;   
//     const {timeTableCreateId,employeeId}= req.body
//     const updatedBy = req.user.userId;
//     try {
//             if (!(timeTableCreateId && employeeId)) {
//                 return res.status(400).send("Both timeTableCreateId and employeeId are required for each object.");
//             }
        
//         const result = await timeTableCreateServices.updateFaculityLoad(timeTableCreateId,req.body,updatedBy);
//         res.status(200).send(result);
//     } catch (error) {
//         console.error(`Error in updating faculity load`, error);
//         res.status(500).send("Internal Server Error");
//     }
// };

// // delete time table

// export const deleteFaculityLoad = async (req,res) => {
//     const {timeTableCreateId} = req.query;
//     try {
//         if (!timeTableCreateId){
//             res.status(400).send("faculity Load Id is required");
//         }else{
//             const result = await timeTableCreateServices.deleteFaculityLoad(timeTableCreateId);
//             res.status(200).send(result);
//         }
//     } catch (error) {
//         console.error(`Error in deleting faculity load Id ${timeTableCreateId}:`, error);
//         res.status(500).send("Internal Server Error");
//     }
// };
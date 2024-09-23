import * as faculityLoadServices  from '../services/faculityService.js';

export const addFaculityLoad = async (req,res) => {
    try {
        const data = req.body;
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const {employeeId} = req.body;
        if(!employeeId){
          return res.status(400).send('courseId is required')
        }
        const result = await faculityLoadServices.addFaculityLoad(data,createdBy,updatedBy);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in adding faculity load:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getFaculityLoadDetails = async (req,res) => {
    const universityId = req.user.universityId;
    try {
        const result = await faculityLoadServices.getFaculityLoadDetails(universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting faculity load:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSingleFaculityLoadDetails = async (req,res) => {
    const universityId = req.user.universityId;
    let {employeeId} = req.query
    try {
        const result = await faculityLoadServices.getSingleFaculityLoadDetails(employeeId,universityId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting faculity load:", error);
        res.status(500).send("Internal Server Error");
    }
};

// update time table 
export const updateFaculityLoad = async (req,res) => {
    const info = req.body;   
    const {faculityLoadId,employeeId}= req.body
    const updatedBy = req.user.userId;
    try {
            if (!(faculityLoadId && employeeId)) {
                return res.status(400).send("Both faculityLoadId and employeeId are required for each object.");
            }
        
        const result = await faculityLoadServices.updateFaculityLoad(faculityLoadId,req.body,updatedBy);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in updating faculity load`, error);
        res.status(500).send("Internal Server Error");
    }
};

// delete time table

export const deleteFaculityLoad = async (req,res) => {
    const {faculityLoadId} = req.query;
    try {
        if (!faculityLoadId){
            res.status(400).send("faculity Load Id is required");
        }else{
            const result = await faculityLoadServices.deleteFaculityLoad(faculityLoadId);
            res.status(200).send(result);
        }
    } catch (error) {
        console.error(`Error in deleting faculity load Id ${faculityLoadId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};
import * as codeMasterServices  from '../services/codeMasterServices.js';

export const getAllEmployeeType = async (req,res) => {
    try {
        const result = await codeMasterServices.getAllEmployeeType();
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting all employee type:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const addEmployeeCode = async (req,res) => {
    try {
        const data = req.body
        const {employeeCodeMasterId} = req.body;
        if(!employeeCodeMasterId){
          return res.status(400).send('University Id is required')
        }
        const result = await codeMasterServices.addEmployeeCode(data);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in adding employee code:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getEmployeeCodesTypes = async (req,res) => {
    let {employeeCodeMasterId} = req.query
    employeeCodeMasterId = employeeCodeMasterId || 0 
    try {
        const result = await codeMasterServices.getEmployeeCodesTypes(employeeCodeMasterId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting employee code and types:", error);
        res.status(500).send("Internal Server Error");
    }
};

// update updateCodeMasterType 
export const updateCodeMasterType = async (req,res) => {
    const {employeeCodeMasterTypeId} = req.body;
    const info = req.body;
    try {
        if (!(employeeCodeMasterTypeId)){
            res.status(400).send("employee Code Master Type Id is required");
        }
        const result = await codeMasterServices.updateCodeMasterType(employeeCodeMasterTypeId,info);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in updating Code Master Type ${employeeCodeMasterTypeId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};

// delete code master

export const deleteCodeMasterType = async (req,res) => {
    const {employeeCodeMasterTypeId} = req.params;
    try {
        if (!employeeCodeMasterTypeId){
            res.status(400).send("employee Code Master TypeId is required");
        }else{
            const result = await codeMasterServices.deleteCodeMasterType(employeeCodeMasterTypeId);
            res.status(200).send(result);
        }
    } catch (error) {
        console.error(`Error in deleting code master Id ${employeeCodeMasterTypeId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};
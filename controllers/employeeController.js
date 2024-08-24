import * as employee  from '../services/employeeServices.js';

export const addEmployee = async (req,res) => {
    try {
        const data = req.body
        const file = req.files;
        const {campusId,instituteId} = req.body;
        if(!(campusId && instituteId)){
          return res.status(400).send('campusId,instituteId is required')
        }
        const result = await employee.addEmployee(data);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in adding employee:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getAllEmployee = async (req,res) => {
    try {
        const result = await employee.getAllEmployee();
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting all employee:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSingleEmployeeDetails = async (req,res) => {
    const employeeId = req.params.id
    try {
        if(!employeeId){
            return res.status(400).send('employeeId is required')
        }
        const result = await employee.getSingleEmployeeDetails(employeeId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting single employee details:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const deleteEmployeeDetail = async (req,res) => {
    const employeeId = req.params.id;
    try {
        if (!employeeId){
            res.status(400).send("employee Id is required");
        }else{
            const result = await employee.deleteEmployeeDetail(employeeId);
            res.status(200).send(result);
        }
    } catch (error) {
        console.error(`Error in deleting employeeId Id ${employeeId}:`, error);
        res.status(500).send("Internal Server Error");
    }
};
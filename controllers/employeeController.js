import * as employee  from '../services/employeeServices.js';
import * as fileHandler from '../utility/fileHandler.js';

export const addEmployee = async (req,res) => {
    const universityId = req.user.universityId;
    try {
        const data = req.body
        const file = req.files;
        const createdBy = req.user.userId;
        const {campusId,instituteId,roleId} = req.body;
        if(!(campusId && instituteId && roleId)){
          return res.status(400).send('campusId,instituteId is required')
        }
        const result = await employee.addEmployee(data,file,createdBy,universityId,roleId,instituteId);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in adding employee:", error); 
        res.status(500).send("Internal Server Error");
    }
};

export const getAllEmployee = async (req,res) => {
    const universityId = req.user.universityId;
    const headInstituteId = req.user.instituteId;
    const role = req.user.role;
    const {campusId,instituteId,acedmicYearId} = req.query
    try {
        const result = await employee.getAllEmployee(universityId,campusId,instituteId,acedmicYearId,headInstituteId,role);
        res.status(200).send(result);
    } catch (error) {
        console.error("Error in getting all employee:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getSingleEmployeeDetails = async (req,res) => {
    const employeeId = req.params.id
    const universityId = req.user.universityId;
    try {
        if(!employeeId){
            return res.status(400).send('employeeId is required')
        }
        const result = await employee.getSingleEmployeeDetails(employeeId,universityId);
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

export const importEmployeeData = async (req, res) => {
  try {
    const { campusId, instituteId, roleId, acedmicYearId } = req.body;
    const universityId = req.user.universityId;    
    const createdBy = req.user.userId;
    const data = { ...req.body, universityId, createdBy }; 

    if (!(campusId && instituteId && roleId && acedmicYearId)) {
      return res.status(400).json({ error: 'campusId, instituteId, roleId, and acedmicYearId are required' });
    }

    const excelFile = req.files?.employee;
    if (!excelFile) {
      return res.status(400).json({ error: 'Excel file is required' });
    }

    const excelData = fileHandler.readExcelFile(excelFile.data);
    if (!excelData) {
      return res.status(400).json({ error: 'Error reading the Excel file' });
    }

    const result = await employee.importEmployeeData(excelData, data);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({ message: result.message });

  } catch (error) {
    console.error("Controller Error:", error); 
    res.status(500).json({ error: error.message || 'An unexpected error occurred' });
  }
};

export const updateEmployee = async (req, res) => {
  const universityId = req.user.universityId;
  const employeeId = req.params.id;
  try {
    const data = req.body;
    const file = req.files;
    const updatedBy = req.user.userId;
    const createdBy = req.user.userId;
    const { campusId, instituteId, roleId } = req.body;

    if (!(campusId && instituteId && roleId)) {
      return res.status(400).send("campusId, instituteId and roleId are required");
    }

    const result = await employee.updateEmployee(
      employeeId,
      data,
      file,
      updatedBy,
      createdBy,
      universityId,
      roleId,
      instituteId
    );

    res.status(200).send(result);
  } catch (error) {
    console.error("Error in updating employee:", error);
    res.status(500).send("Internal Server Error");
  }
};
import * as codeMasterServices from '../services/codeMasterServices.js';

export const getAllEmployeeType = async (req, res) => {
    try {
        const result = await codeMasterServices.getAllEmployeeType();
        res.status(200).send(result);
    } catch (error) {
        console.error('Error in getting all employee type:', error);
        res.status(500).send('Internal Server Error');
    }
};

export const addEmployeeCode = async (req, res) => {
    try {
        const createdBy = req.user.userId;
        const result = await codeMasterServices.addEmployeeCode(req.body, createdBy);
        res.status(201).send(result);
    } catch (error) {
        console.error('Error in adding employee code:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).send(error.message || 'Internal Server Error');
    }
};

export const getEmployeeCodesTypes = async (req, res) => {
    const { employeeCodeMasterId, key } = req.query;
    try {
        const result = await codeMasterServices.getEmployeeCodesTypes(employeeCodeMasterId, key);
        res.status(200).send(result);
    } catch (error) {
        console.error('Error in getting employee code and types:', error);
        res.status(500).send('Internal Server Error');
    }
};

export const updateCodeMasterType = async (req, res) => {
    const { employeeCodeMasterTypeId } = req.params;
    try {
        const updated = await codeMasterServices.updateCodeMasterType(employeeCodeMasterTypeId, req.body);
        if (!updated) {
            return res.status(404).send('Code master type not found');
        }
        res.status(200).send({ message: 'Code master type updated successfully' });
    } catch (error) {
        console.error(`Error in updating Code Master Type ${employeeCodeMasterTypeId}:`, error);
        res.status(500).send('Internal Server Error');
    }
};

export const deleteCodeMasterType = async (req, res) => {
    const { employeeCodeMasterTypeId } = req.params;
    try {
        const result = await codeMasterServices.deleteCodeMasterType(employeeCodeMasterTypeId);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in deleting code master Id ${employeeCodeMasterTypeId}:`, error);
        res.status(500).send('Internal Server Error');
    }
};

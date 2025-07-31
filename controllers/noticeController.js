import * as notice  from  "../services/noticeServices.js";

export async function addNotice(req, res) {        
    const {acedmicYearId,title} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const role = req.user.role;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if(!(acedmicYearId && title)){
           return res.status(400).send('acedmicYearId,title is required')
        }
        const noticeData = await notice.addNotice(req.body,createdBy,updatedBy,role,universityId,instituteId);
            res.status(201).json({ message: "Data added successfully", noticeData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllStudentNotice(req, res) {
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role;    
    const {acedmicYearId} = req.query
    try {
        const notices = await notice.getAllStudentNotice(universityId,instituteId,role,acedmicYearId);
        res.status(200).json(notices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSinglenoticeDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { noticeId } = req.query;
        const feeDetail = await notice.getSinglenoticeDetails(noticeId,universityId);
        if (feeDetail) {
            res.status(200).json(feeDetail);
        } else {
            res.status(404).json({ message: "fee Plan not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateNotice(req, res) {
    try {
        const {noticeId} = req.body
        if(!(noticeId)){
            return res.status(400).send('noticeId is required')
         }
         const updatedBy = req.user.userId;
        const updatednotice = await notice.updateNotice(noticeId, req.body,updatedBy);
            res.status(200).json({message: "notice update succesfully" ,updatednotice});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteNotice(req, res) {
    try {
        const { noticeId } = req.query;
        if (!noticeId) {
            return res.status(400).json({ message: "noticeId is required" });
        }
        const deleted = await notice.deleteNotice(noticeId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for notice ID ${noticeId}` });
        } else {
            res.status(404).json({ message: "notice not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
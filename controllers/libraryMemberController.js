import * as memberCreation  from  "../services/libraryMemberServices.js";

export async function addMember(req, res) {
    const {libraryCreationId,memberType} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(libraryCreationId && memberType)){
           return res.status(400).send('libraryCreationId and memberType is required')
        }
        const newMember = await memberCreation.addMember(req.body,createdBy,updatedBy);
        res.status(201).json({ message: "Member Add Successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getMemberDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const member = await memberCreation.getMemberDetails(universityId);
        res.status(200).json(member);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleMemberDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { libraryCreationId } = req.query;
        const Member = await memberCreation.getSingleMemberDetails(libraryCreationId,universityId);
        if (Member) {
            res.status(200).json(Member);
        } else {
            res.status(404).json({ message: "Member not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateMember(req, res) {
    try {
        const {libraryMemberId} = req.body
        if(!(libraryMemberId)){
            return res.status(400).send('library Member Id is required')
         }
         const updatedBy = req.user.userId;
        const updatedMember = await memberCreation.updateMember(libraryMemberId, req.body,updatedBy);
            res.status(200).json({message: "Member Creation update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteMember(req, res) {
    try {
        const { libraryMemberId } = req.query;
        if (!libraryMemberId) {
            return res.status(400).json({ message: "library Member Id is required" });
        }
        const deleted = await memberCreation.deleteMember(libraryMemberId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for Member creation ID ${libraryMemberId}` });
        } else {
            res.status(404).json({ message: "Member not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// book issue

export async function bookIssue(req, res) {
    const {libraryAddItemId,libraryMemberId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(libraryAddItemId && libraryMemberId)){
           return res.status(400).send('libraryAddItemId and libraryMemberId is required')
        }
        const newMember = await memberCreation.bookIssue(req.body,createdBy,updatedBy);
        res.status(201).json({ message: "book Issue Successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAllIssueBooks(req, res) {
    const universityId = req.user.universityId;
    try {
        const member = await memberCreation.getAllIssueBooks(universityId);
        res.status(200).json(member);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getBookByMemberId(req, res) {
    const universityId = req.user.universityId;
    try {
        const { libraryMemberId } = req.query;
        const Member = await memberCreation.getBookByMemberId(libraryMemberId,universityId);
        if (Member) {
            res.status(200).json(Member);
        } else {
            res.status(404).json({ message: "Member not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateBookAndStatus(req, res) {
    try {
        const {libraryIssueBookId} = req.body
        if(!(libraryIssueBookId)){
            return res.status(400).send('libraryIssueBookId is required')
         }
         const updatedBy = req.user.userId;
        const updatedMember = await memberCreation.updateBookAndStatus(libraryIssueBookId, req.body,updatedBy);
            res.status(200).json({message: "Book update succesfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteBook(req, res) {
    try {
        const { libraryIssueBookId } = req.query;
        if (!libraryIssueBookId) {
            return res.status(400).json({ message: "libraryIssueBookId is required" });
        }
        const deleted = await memberCreation.deleteBook(libraryIssueBookId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for Member creation ID ${libraryIssueBookId}` });
        } else {
            res.status(404).json({ message: "Book Issue not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
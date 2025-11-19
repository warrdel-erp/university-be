import {Router} from  'express'
const router =  Router();
import {addFloor,getAllFloor,getSingleFloorDetails,updateFloor,deleteFloor,
    addAisle, getAllAisle, getSingleAisleDetails, updateAisle, deleteAisle,
    addRack, getAllRack, getSingleRackDetails, updateRack, deleteRack,
    addRow, getAllRow, getSingleRowDetails, updateRow, deleteRow
} from "../controllers/libraryStructureController.js";
import userAuth from "../middleware/authUser.js"

router.post('/floor', userAuth, addFloor);

router.get('/allFloor', userAuth, getAllFloor);

router.get('/singleFloor' ,userAuth, getSingleFloorDetails);

router.patch('/updateFloor' ,userAuth, updateFloor);

router.delete('/deleteFloor' ,userAuth, deleteFloor);

// ------------------ AISLE ROUTES ------------------
router.post('/aisle', userAuth, addAisle);
router.get('/allAisle', userAuth, getAllAisle);
router.get('/singleAisle', userAuth, getSingleAisleDetails);
router.patch('/updateAisle', userAuth, updateAisle);
router.delete('/deleteAisle', userAuth, deleteAisle);

// ------------------ RACK ROUTES ------------------
router.post('/rack', userAuth, addRack);
router.get('/allRack', userAuth, getAllRack);
router.get('/singleRack', userAuth, getSingleRackDetails);
router.patch('/updateRack', userAuth, updateRack);
router.delete('/deleteRack', userAuth, deleteRack);

// ------------------ ROW ROUTES ------------------
router.post('/row', userAuth, addRow);
router.get('/allRow', userAuth, getAllRow);
router.get('/singleRow', userAuth, getSingleRowDetails);
router.patch('/updateRow', userAuth, updateRow);
router.delete('/deleteRow', userAuth, deleteRow);

export default router;
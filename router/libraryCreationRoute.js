import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import {
  addLibrary,
  getLibraryDetails,
  getSingleLibraryDetails,
  updateLibray,
  deleteLibray,
  addBookWithInventory,
  getAllBooks,
  getSingleBookDetails,
  updateBook,
  updateInventory,
  deleteBook,
  deleteInventoryCopy,
  getAllIssuedBooks,
  bulkUploadBooks,
} from "../controllers/libraryCreationController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const idQuerySchema = z.object({
  libraryCreationId: z.coerce.number(),
});

const floorSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
});

const addLibrarySchema = z.object({
  instituteId: z.coerce.number(),
  name: z.string(),
  description: z.string().optional().nullable(),
  campusId: z.coerce.number().optional(),
  floors: z.array(floorSchema),
});

const updateLibrarySchema = z.object({
  libraryCreationId: z.coerce.number(),
  instituteId: z.coerce.number().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
});

const libraryBookQuerySchema = z.object({
  libraryBookId: z.coerce.number(),
});

const inventoryQuerySchema = z.object({
  inventoryId: z.coerce.number(),
});

const listBooksQuerySchema = z.object({
  libraryCreationId: z.coerce.number(),
  libraryFloorId: z.coerce.number(),
});

const bookSchema = z.object({
  libraryCreationId: z.coerce.number(),
  libraryFloorId: z.coerce.number().optional(),
  title: z.string(),
  subtitle: z.string().optional().nullable(),
  authors: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  placeOfPublication: z.string().optional().nullable(),
  yearOfPublication: z.coerce.number().optional().nullable(),
  edition: z.string().optional().nullable(),
  seriesTitle: z.string().optional().nullable(),
  volumeNumber: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  isbn: z.string().optional().nullable(),
  issn: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  physicalDescription: z.string().optional().nullable(),
  numberOfPages: z.coerce.number().optional().nullable(),
  illustrations: z.boolean().optional().nullable(),
  summary: z.string().optional().nullable(),
  keywords: z.string().optional().nullable(),
  additionalAuthor: z.string().optional().nullable(),
  subjectId: z.coerce.number().optional().nullable(),
  classSectionsId: z.coerce.number().optional().nullable(),
  remark: z.string().optional().nullable(),
  itemType: z.string().optional().nullable(),
});

const inventoryRowSchema = z.object({
  excisionNumber: z.string().optional().nullable(),
  accessionNo: z.string().optional().nullable(),
  libraryAisleId: z.coerce.number(),
  libraryRackId: z.coerce.number(),
  libraryRowId: z.coerce.number(),
  studentId: z.coerce.number().optional().nullable(),
  employeeId: z.coerce.number().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.string().optional(),
  billNo: z.string().optional().nullable(),
  billDate: z.string().optional().nullable(),
  itemPrice: z.union([z.string(), z.coerce.number()]).optional().nullable(),
  netPrice: z.union([z.string(), z.coerce.number()]).optional().nullable(),
  currency: z.string().optional().nullable(),
});

const addBookWithInventorySchema = z.object({
  book: bookSchema,
  inventory: z.union([inventoryRowSchema, z.array(inventoryRowSchema)]),
});

const updateBookSchema = z.object({
  libraryBookId: z.coerce.number(),
  libraryCreationId: z.coerce.number().optional(),
  libraryFloorId: z.coerce.number().optional(),
  title: z.string().optional(),
  subtitle: z.string().nullable().optional(),
  authors: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  placeOfPublication: z.string().nullable().optional(),
  yearOfPublication: z.coerce.number().nullable().optional(),
  edition: z.string().nullable().optional(),
  seriesTitle: z.string().nullable().optional(),
  volumeNumber: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  isbn: z.string().nullable().optional(),
  issn: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  physicalDescription: z.string().nullable().optional(),
  numberOfPages: z.coerce.number().nullable().optional(),
  illustrations: z.boolean().nullable().optional(),
  summary: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  additionalAuthor: z.string().nullable().optional(),
  subjectId: z.coerce.number().nullable().optional(),
  classSectionsId: z.coerce.number().nullable().optional(),
  remark: z.string().nullable().optional(),
  itemType: z.string().nullable().optional(),
});

const updateInventorySchema = z.object({
  inventoryId: z.coerce.number(),
  excisionNumber: z.string().optional().nullable(),
  accessionNo: z.string().optional().nullable(),
  libraryAisleId: z.coerce.number().optional(),
  libraryRackId: z.coerce.number().optional(),
  libraryRowId: z.coerce.number().optional(),
  studentId: z.coerce.number().optional().nullable(),
  employeeId: z.coerce.number().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.string().optional(),
  billNo: z.string().optional().nullable(),
  billDate: z.string().optional().nullable(),
  itemPrice: z.union([z.string(), z.coerce.number()]).optional().nullable(),
  netPrice: z.union([z.string(), z.coerce.number()]).optional().nullable(),
  currency: z.string().optional().nullable(),
});

router.post("/", userAuth, validate({ body: addLibrarySchema }), addLibrary);

router.get("/", userAuth, getLibraryDetails);

router.get("/single", userAuth, validate({ query: idQuerySchema }), getSingleLibraryDetails);

router.patch("/", userAuth, validate({ body: updateLibrarySchema }), updateLibray);

router.delete("/", userAuth, validate({ query: idQuerySchema }), deleteLibray);

router.post("/addBook", userAuth, validate({ body: addBookWithInventorySchema }), addBookWithInventory);

router.get("/allBook", userAuth, validate({ query: listBooksQuerySchema }), getAllBooks);

router.get("/singleBook", userAuth, validate({ query: libraryBookQuerySchema }), getSingleBookDetails);

router.patch("/updateBook", userAuth, validate({ body: updateBookSchema }), updateBook);

router.patch("/updateInventory", userAuth, validate({ body: updateInventorySchema }), updateInventory);

router.delete("/deleteBook", userAuth, validate({ query: libraryBookQuerySchema }), deleteBook);

router.delete("/deleteInventory", userAuth, validate({ query: inventoryQuerySchema }), deleteInventoryCopy);

router.get("/issuedBook", userAuth, getAllIssuedBooks);

router.post("/bulkUpload", userAuth, bulkUploadBooks);
export default router;
import { Router } from "express";
import { z } from "zod";
import { validate } from "../utility/validation.js";
import {
  addLibrary,
  getLibraryDetails,
  getSingleLibraryDetails,
  updateLibray,
  deleteLibray,
  bulkGenerateFloorStructure,
  getFloorStructure,
  addBookWithInventory,
  getBookSummaryStats,
  getAllBooks,
  getSingleBookDetails,
  updateBookWithInventory,
  deleteBook,
  deleteInventoryCopy,
  getAllIssuedBooks,
  bulkUploadBooks,
  addCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/libraryCreationController.js";
import userAuth from "../middleware/authUser.js";

const router = Router();

const idQuerySchema = z.object({
  libraryCreationId: z.coerce.number(),
});

const libraryFloorIdParamSchema = z.object({
  libraryFloorId: z.coerce.number(),
});

const positiveStructureCount = (label) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .int({ message: `${label} must be a whole number` })
    .min(1, { message: `${label} must be at least 1` });

const bulkFloorStructureSchema = z.object({
  aisles: positiveStructureCount("Aisles"),
  racksPerAisle: positiveStructureCount("Racks per aisle"),
  rowsPerRack: positiveStructureCount("Rows per rack"),
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

const optionalTrimmedString = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === "" ? undefined : v.trim()));

const optionalLibraryFloorId = z
  .union([z.coerce.number(), z.literal("")])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const listBooksQuerySchema = z.object({
  libraryCreationId: z.coerce.number(),
  libraryFloorId: optionalLibraryFloorId,
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: optionalTrimmedString,
});

const bookSummaryQuerySchema = z.object({
  libraryCreationId: z.coerce.number(),
  libraryFloorId: optionalLibraryFloorId,
});

const addCategorySchema = z.object({
  name: z.string(),
});

const updateCategorySchema = z.object({
  libraryCategoryId: z.coerce.number(),
  name: z.string().optional(),
});

const categoryQuerySchema = z.object({
  libraryCategoryId: z.coerce.number(),
});

const bookSchema = z.object({
  libraryCreationId: z.coerce.number().optional().nullable(),
  libraryFloorId: z.coerce.number().optional(),
  bookImage: z.string().optional().nullable(),
  title: z.string().min(1),
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
  subjectId: z.array(z.number()).optional().nullable(),
  categoryId: z.array(z.coerce.number()).optional().nullable(),
  classSectionsId: z.coerce.number().optional().nullable(),
  remark: z.string().optional().nullable(),
  itemType: z.string().optional().nullable(),
});

const inventoryRowSchema = z.object({
  accessionNumber: z.string().min(1),
  libraryAisleId: z.coerce.number().optional().nullable(),
  libraryRackId: z.coerce.number().optional().nullable(),
  libraryRowId: z.coerce.number().optional().nullable(),
  studentId: z.coerce.number().optional().nullable(),
  employeeId: z.coerce.number().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.string().optional(),
  condition: z.string().optional().nullable(),
  accessionDate: z.string().optional().nullable(),
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
  bookImage: z.string().optional().nullable(),
  title: z.string().min(1),
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
  subjectId: z.array(z.number()).nullable().optional(),
  categoryId: z.array(z.coerce.number()).nullable().optional(),
  classSectionsId: z.coerce.number().nullable().optional(),
  remark: z.string().nullable().optional(),
  itemType: z.string().nullable().optional(),
});

const updateInventorySchema = z.object({
  inventoryId: z.coerce.number(),
  accessionNumber: z.string().min(1),
  libraryAisleId: z.coerce.number().optional().nullable(),
  libraryRackId: z.coerce.number().optional().nullable(),
  libraryRowId: z.coerce.number().optional().nullable(),
  studentId: z.coerce.number().optional().nullable(),
  employeeId: z.coerce.number().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.string().optional(),
  condition: z.string().optional().nullable(),
  accessionDate: z.string().optional().nullable(),
  billNo: z.string().optional().nullable(),
  billDate: z.string().optional().nullable(),
  itemPrice: z.union([z.string(), z.coerce.number()]).optional().nullable(),
  netPrice: z.union([z.string(), z.coerce.number()]).optional().nullable(),
  currency: z.string().optional().nullable(),
});

const newInventoryRowSchema = inventoryRowSchema.extend({
  libraryBookId: z.coerce.number().optional(),
});

const inventoryItemSchema = z.union([updateInventorySchema, newInventoryRowSchema]);

const updateBookWithInventorySchema = z
  .object({
    book: updateBookSchema.optional(),
    inventory: z.array(inventoryItemSchema).optional(),
  })
  .refine((val) => val.book || (val.inventory?.length ?? 0) > 0, {
    message: "Either `book` or a non-empty `inventory` array must be provided",
  });

router.post("/", userAuth, validate({ body: addLibrarySchema }), addLibrary);

router.get("/", userAuth, getLibraryDetails);

router.get("/single", userAuth, validate({ query: idQuerySchema }), getSingleLibraryDetails);

router.patch("/", userAuth, validate({ body: updateLibrarySchema }), updateLibray);

router.delete("/", userAuth, validate({ query: idQuerySchema }), deleteLibray);

router.post(
  "/floor/:libraryFloorId/structure",
  userAuth,
  validate({ params: libraryFloorIdParamSchema, body: bulkFloorStructureSchema }),
  bulkGenerateFloorStructure,
);

router.get(
  "/floor/:libraryFloorId/structure",
  userAuth,
  validate({ params: libraryFloorIdParamSchema }),
  getFloorStructure,
);

router.post("/addCategory", userAuth, validate({ body: addCategorySchema }), addCategory);
router.get("/getAllCategories", userAuth, getAllCategories);
router.patch("/updateCategory", userAuth, validate({ body: updateCategorySchema }), updateCategory);
router.delete("/deleteCategory", userAuth, validate({ query: categoryQuerySchema }), deleteCategory);

router.post("/addBook", userAuth, validate({ body: addBookWithInventorySchema }), addBookWithInventory);
router.get("/bookSummary", userAuth, validate({ query: bookSummaryQuerySchema }), getBookSummaryStats);
router.get("/allBook", userAuth, validate({ query: listBooksQuerySchema }), getAllBooks);

router.get("/singleBook", userAuth, validate({ query: libraryBookQuerySchema }), getSingleBookDetails);

router.patch(
  "/updateBook",
  userAuth,
  validate({ body: updateBookWithInventorySchema }),
  updateBookWithInventory,
);

router.delete("/deleteBook", userAuth, validate({ query: libraryBookQuerySchema }), deleteBook);

router.delete("/deleteInventory", userAuth, validate({ query: inventoryQuerySchema }), deleteInventoryCopy);

router.get("/issuedBook", userAuth, getAllIssuedBooks);

router.post(
  "/bulkUpload",
  userAuth,
  validate({ query: idQuerySchema }),
  bulkUploadBooks,
);


export default router;
import { Router } from "express";
import {
  getProfile,
  updateProfile,
  uploadProfilePicture,
  getAllEmployees,
  getEmployeeById,
  updateEmployeeStatus,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employee.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Employee routes
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.post("/profile-picture", upload.single("profilePicture"), uploadProfilePicture);

// Admin/HR routes
router.get("/", authorizeRoles("admin", "hr"), getAllEmployees);
router.post("/", authorizeRoles("admin", "hr"), createEmployee);
router.get("/:id", authorizeRoles("admin", "hr"), getEmployeeById);
router.put("/:id", authorizeRoles("admin", "hr"), updateEmployee);
router.patch("/:id/status", authorizeRoles("admin", "hr"), updateEmployeeStatus);
router.delete("/:id", authorizeRoles("admin"), deleteEmployee);

export default router;

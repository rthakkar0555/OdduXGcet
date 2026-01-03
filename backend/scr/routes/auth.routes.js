import { Router } from "express";
import {
  signup,
  signin,
  logout,
  refreshAccessToken,
  getCurrentUser,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  signupValidation,
  signinValidation,
} from "../middlewares/validation.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes
router.post("/signup", upload.single("logo"), ...signupValidation, signup);
router.post("/signin", ...signinValidation, signin);
router.post("/refresh-token", refreshAccessToken);

// Protected routes
router.post("/logout", verifyJWT, logout);
router.get("/me", verifyJWT, getCurrentUser);

export default router;

import { User } from "../models/user.model.js";
import { Employee } from "../models/employee.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiRespons } from "../utils/ApiRespons.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { sendVerificationEmail, sendWelcomeEmail } from "../utils/emailService.js";
import jwt from "jsonwebtoken";

// Generate employee ID (EMP + timestamp + random)
const generateEmployeeId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `EMP${timestamp}${random}`;
};

// Generate random password
const generateRandomPassword = () => {
  const length = 12;
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = "";
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split("").sort(() => Math.random() - 0.5).join("");
};

// Generate Login ID: LOI (first 2 letters of first name + last name) (year of joining) (serial number)
// Example: OIJODO20220001
// Format: [CompanyPrefix][First2Letters][Last2Letters][Year][SerialNumber]
const generateLoginId = async (firstName, lastName, companyName, joiningDate) => {
  // Get first 2 letters of first name and last name
  const firstTwo = (firstName || "XX").substring(0, 2).toUpperCase().padEnd(2, "X");
  const lastTwo = (lastName || "XX").substring(0, 2).toUpperCase().padEnd(2, "X");
  const namePart = firstTwo + lastTwo;
  
  // Get year from joining date (or current year if not provided)
  const joinDate = joiningDate ? new Date(joiningDate) : new Date();
  const year = joinDate.getFullYear();
  
  // Get company prefix (first 2 letters of company name, default to "OI" for Odoo India)
  let companyPrefix = "OI";
  if (companyName && companyName.trim().length >= 2) {
    const prefix = companyName.trim().substring(0, 2).toUpperCase().replace(/[^A-Z]/g, "");
    if (prefix.length >= 2) {
      companyPrefix = prefix;
    }
  }
  
  // Find the last serial number for this year and company pattern
  const pattern = new RegExp(`^${companyPrefix}${namePart}${year}`);
  const lastUser = await User.findOne({
    loginId: pattern
  }).sort({ loginId: -1 });
  
  let serialNumber = 1;
  if (lastUser && lastUser.loginId) {
    const lastSerial = parseInt(lastUser.loginId.slice(-4));
    if (!isNaN(lastSerial)) {
      serialNumber = lastSerial + 1;
    }
  }
  
  return `${companyPrefix}${namePart}${year}${serialNumber.toString().padStart(4, "0")}`;
};

// Generate access and refresh tokens
const generateTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Token Generation Error:", error);
    throw new ApiError(
      500,
      "Something went wrong while generating tokens"
    );
  }
};

// @desc    Change password
// @route   POST /api/v1/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters long");
  }

  // Find user
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Verify current password
  const isPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiRespons(200, {}, "Password changed successfully"));
});

// @desc    Register new user (Company/Admin initial setup only)
// @route   POST /api/v1/auth/signup
// @access  Public (but should be restricted in production)
export const signup = asyncHandler(async (req, res) => {
  const { companyName, name, email, phone, password, confirmPassword, role } = req.body;

  // Validate password confirmation
  if (password !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // Handle logo upload if provided
  let companyLogo = null;
  if (req.file) {
    const logoUpload = await uploadOnCloudinary(req.file.path);
    if (logoUpload) {
      companyLogo = logoUpload.url;
    }
  }

  // Parse name into first and last name
  const nameParts = (name || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Generate Login ID
  const loginId = await generateLoginId(firstName, lastName, companyName);

  // Generate unique employee ID
  const employeeId = generateEmployeeId();

  // Generate email verification token
  const emailVerificationToken = jwt.sign(
    { email, userId: null }, // userId will be set after user creation
    process.env.ACCESS_TOKEN_SECRET || "default-secret",
    { expiresIn: "24h" }
  );

  // Create user
  const user = await User.create({
    loginId,
    employeeId,
    email,
    password,
    companyName: companyName || null,
    companyLogo: companyLogo || null,
    role: role || "employee",
    emailVerificationToken,
    emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  // Update token with actual userId
  const updatedToken = jwt.sign(
    { email, userId: user._id },
    process.env.ACCESS_TOKEN_SECRET || "default-secret",
    { expiresIn: "24h" }
  );
  user.emailVerificationToken = updatedToken;
  await user.save();

  // Create employee profile
  const employee = await Employee.create({
    user: user._id,
    personalDetails: {
      fullName: name || "New Employee",
      phone: phone || null,
    },
    jobDetails: {
      designation: "Not Assigned",
      department: "General",
      joiningDate: new Date(),
    },
  });

  // Link employee profile to user
  user.employeeProfile = employee._id;
  await user.save();

  // Send verification email
  try {
    await sendVerificationEmail(email, updatedToken, name);
  } catch (emailError) {
    console.error("Failed to send verification email:", emailError);
    // Don't fail the signup if email fails
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokens(user._id);

  // Get created user without sensitive fields
  const createdUser = await User.findById(user._id)
    .select("-password -refreshToken")
    .populate("employeeProfile");

  // Cookie options
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiRespons(
        201,
        {
          user: createdUser,
          accessToken,
          refreshToken,
        },
        "User registered successfully"
      )
    );
});

// @desc    Login user
// @route   POST /api/v1/auth/signin
// @access  Public
export const signin = asyncHandler(async (req, res) => {
  const { loginIdOrEmail, password } = req.body;

  if (!loginIdOrEmail || !password) {
    throw new ApiError(400, "Login ID/Email and password are required");
  }

  // Find user by loginId or email
  const user = await User.findOne({
    $or: [
      { loginId: loginIdOrEmail },
      { email: loginIdOrEmail.toLowerCase() }
    ]
  }).populate("employeeProfile");

  if (!user) {
    throw new ApiError(401, "Invalid login ID/email or password");
  }

  // Check password
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid login ID/email or password");
  }

  // Check if email is verified, if not, send verification email
  if (!user.isEmailVerified) {
    try {
      // Generate new verification token if needed
      let verificationToken = user.emailVerificationToken;
      
      // If token doesn't exist or is expired, generate a new one
      if (!verificationToken || (user.emailVerificationTokenExpiry && user.emailVerificationTokenExpiry < new Date())) {
        verificationToken = jwt.sign(
          { email: user.email, userId: user._id },
          process.env.ACCESS_TOKEN_SECRET || "default-secret",
          { expiresIn: "24h" }
        );
        
        user.emailVerificationToken = verificationToken;
        user.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();
      }

      // Get employee name for email
      const employee = await Employee.findOne({ user: user._id });
      const name = employee?.personalDetails?.fullName || user.email;

      // Send verification email
      const emailResult = await sendVerificationEmail(user.email, verificationToken, name);
      
      if (!emailResult.success) {
        console.error("Failed to send verification email on login:", emailResult.error);
      }
    } catch (emailError) {
      console.error("Error sending verification email on login:", emailError);
      // Don't block login if email fails
    }
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokens(user._id);

  // Get user without sensitive fields
  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")
    .populate("employeeProfile");

  // Cookie options
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiRespons(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
          emailVerificationSent: !user.isEmailVerified, // Indicate if verification email was sent
        },
        user.isEmailVerified 
          ? "User logged in successfully" 
          : "User logged in successfully. Please check your email to verify your account."
      )
    );
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiRespons(200, {}, "User logged out successfully"));
});

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateTokens(user._id);

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiRespons(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password -refreshToken")
    .populate("employeeProfile");

  return res
    .status(200)
    .json(new ApiRespons(200, user, "User fetched successfully"));
});

// @desc    Verify email address
// @route   GET /api/v1/auth/verify-email
// @access  Public
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new ApiError(400, "Verification token is required");
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || "default-secret"
    );

    // Find user by token
    const user = await User.findOne({
      emailVerificationToken: token,
      email: decoded.email,
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired verification token");
    }

    // Check if token is expired
    if (user.emailVerificationTokenExpiry < new Date()) {
      throw new ApiError(400, "Verification token has expired");
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;
    await user.save();

    return res
      .status(200)
      .json(
        new ApiRespons(
          200,
          {},
          "Email verified successfully. You can now login."
        )
      );
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      throw new ApiError(400, "Invalid or expired verification token");
    }
    throw error;
  }
});

// @desc    Resend verification email
// @route   POST /api/v1/auth/resend-verification
// @access  Private
export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email is already verified");
  }

  // Generate new verification token
  const emailVerificationToken = jwt.sign(
    { email: user.email, userId: user._id },
    process.env.ACCESS_TOKEN_SECRET || "default-secret",
    { expiresIn: "24h" }
  );

  user.emailVerificationToken = emailVerificationToken;
  user.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  // Get employee name for email
  const employee = await Employee.findOne({ user: user._id });
  const name = employee?.personalDetails?.fullName || user.email;

  // Send verification email
  try {
    await sendVerificationEmail(user.email, emailVerificationToken, name);
    return res
      .status(200)
      .json(
        new ApiRespons(
          200,
          {},
          "Verification email sent successfully. Please check your inbox."
        )
      );
  } catch (emailError) {
    console.error("Failed to send verification email:", emailError);
    throw new ApiError(500, "Failed to send verification email. Please try again later.");
  }
});

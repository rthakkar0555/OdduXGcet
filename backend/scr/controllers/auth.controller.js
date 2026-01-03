import { User } from "../models/user.model.js";
import { Employee } from "../models/employee.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiRespons } from "../utils/ApiRespons.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

// Generate employee ID (EMP + timestamp + random)
const generateEmployeeId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `EMP${timestamp}${random}`;
};

// Generate Login ID: LOI (first 2 letters of first name + last name) (year) (serial number)
// Example: OIJODO20220001
const generateLoginId = async (firstName, lastName, companyName) => {
  // Get first 2 letters of first name and last name
  const firstTwo = (firstName || "XX").substring(0, 2).toUpperCase().padEnd(2, "X");
  const lastTwo = (lastName || "XX").substring(0, 2).toUpperCase().padEnd(2, "X");
  const namePart = firstTwo + lastTwo;
  
  // Get current year
  const year = new Date().getFullYear();
  
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

// @desc    Register new user
// @route   POST /api/v1/auth/signup
// @access  Public
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

  // Create user
  const user = await User.create({
    loginId,
    employeeId,
    email,
    password,
    companyName: companyName || null,
    companyLogo: companyLogo || null,
    role: role || "employee",
  });

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
        },
        "User logged in successfully"
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

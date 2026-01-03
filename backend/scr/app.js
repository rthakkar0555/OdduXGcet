import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { ApiError } from "./utils/ApiError.js"

// Import routes
import authRoutes from "./routes/auth.routes.js"
import employeeRoutes from "./routes/employee.routes.js"
import attendanceRoutes from "./routes/attendance.routes.js"
import leaveRoutes from "./routes/leave.routes.js"
import payrollRoutes from "./routes/payroll.routes.js"

const app=express()

app.use(cors({
  origin: "http://localhost:5173", // EXACT frontend URL
  credentials: true
}));

app.use(express.json({
  limit:"16kb"
}))

app.use(express.urlencoded({
  limit:"16kb",
  extended:true
}))

app.use(express.static("public"))

app.use(cookieParser())

// API routes
app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/employees", employeeRoutes)
app.use("/api/v1/attendance", attendanceRoutes)
app.use("/api/v1/leaves", leaveRoutes)
app.use("/api/v1/payroll", payrollRoutes)

// Health check route
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Dayflow HRMS API is running" })
})

// Global Error Handler
app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors,
            data: err.data
        });
    }

    console.error("Unhandled Error:", err);
    return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        errors: [],
    });
});

export default app
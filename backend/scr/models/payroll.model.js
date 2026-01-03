import mongoose, { Schema } from "mongoose";

const payrollSchema = new Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    allowances: {
      hra: {
        type: Number,
        default: 0,
        min: 0,
      },
      transport: {
        type: Number,
        default: 0,
        min: 0,
      },
      medical: {
        type: Number,
        default: 0,
        min: 0,
      },
      other: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    deductions: {
      tax: {
        type: Number,
        default: 0,
        min: 0,
      },
      providentFund: {
        type: Number,
        default: 0,
        min: 0,
      },
      other: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate net salary before saving
payrollSchema.pre('save', function (next) {
  const totalAllowances = 
    (this.allowances.hra || 0) +
    (this.allowances.transport || 0) +
    (this.allowances.medical || 0) +
    (this.allowances.other || 0);
  
  const totalDeductions = 
    (this.deductions.tax || 0) +
    (this.deductions.providentFund || 0) +
    (this.deductions.other || 0);
  
  this.netSalary = this.basicSalary + totalAllowances - totalDeductions;
  next();
});

// Index for efficient queries
payrollSchema.index({ employee: 1, effectiveFrom: -1 });

// Ensure one active payroll record per employee
payrollSchema.index({ employee: 1 }, { unique: true });

export const Payroll = mongoose.model("Payroll", payrollSchema);

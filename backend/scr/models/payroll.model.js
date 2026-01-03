import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      unique: true,
    },

    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    allowances: {
      type: Map,
      of: Number,
      default: {},
    },

    deductions: {
      type: Map,
      of: Number,
      default: {},
    },

    netSalary: {
      type: Number,
      required: true,
    },

    effectiveFrom: {
      type: Date,
      default: Date.now,
    },

    currency: {
      type: String,
      default: "INR",
    },
  },
  { timestamps: true }
);

/* ===============================
   CALCULATE NET SALARY (IMPORTANT)
   =============================== */
payrollSchema.pre("validate", function (next) {
  const allowancesTotal = [...this.allowances.values()]
    .reduce((sum, val) => sum + val, 0);

  const deductionsTotal = [...this.deductions.values()]
    .reduce((sum, val) => sum + val, 0);

  this.netSalary =
    (this.basicSalary || 0) + allowancesTotal - deductionsTotal;

  next();
});

export const Payroll = mongoose.model("Payroll", payrollSchema);

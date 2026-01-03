import api from '../lib/api'

// Employee API calls
export const employeeService = {
  // Get all employees (admin/HR only)
  getAll: async () => {
    const response = await api.get('/employees')
    return response.data
  },

  // Get single employee
  getById: async (id) => {
    const response = await api.get(`/employees/${id}`)
    return response.data
  },

  // Get current user's employee profile
  getMyProfile: async () => {
    const response = await api.get('/employees/profile')
    return response.data
  },

  // Create employee (admin/HR only)
  create: async (employeeData) => {
    const response = await api.post('/employees', employeeData)
    return response.data
  },

  // Update employee profile
  update: async (id, employeeData) => {
    // If updating own profile, use profile endpoint
    if (!id || id === 'profile') {
      const response = await api.put('/employees/profile', employeeData)
      return response.data
    }
    // For admin updating other employees, use update endpoint
    const response = await api.put(`/employees/${id}`, employeeData)
    return response.data
  },

  // Delete employee (admin only)
  delete: async (id) => {
    const response = await api.delete(`/employees/${id}`)
    return response.data
  },
}

// Attendance API calls
export const attendanceService = {
  // Get all attendance records (admin/HR only)
  getAll: async (params = {}) => {
    const response = await api.get('/attendance', { params })
    return response.data
  },

  // Get my attendance
  getMy: async (params = {}) => {
    const response = await api.get('/attendance/my-attendance', { params })
    return response.data
  },

  // Check in
  checkIn: async () => {
    const response = await api.post('/attendance/check-in')
    return response.data
  },

  // Check out
  checkOut: async () => {
    const response = await api.post('/attendance/check-out')
    return response.data
  },

  // Mark attendance (admin/HR only)
  mark: async (attendanceData) => {
    const response = await api.post('/attendance/mark', attendanceData)
    return response.data
  },

  // Get today's attendance status
  getTodayStatus: async () => {
    const response = await api.get('/attendance/today')
    return response.data
  },
}

// Leave API calls
export const leaveService = {
  // Get all leaves
  getAll: async (params = {}) => {
    const response = await api.get('/leaves', { params })
    return response.data
  },

  // Get my leaves
  getMy: async () => {
    const response = await api.get('/leaves/my-leaves')
    return response.data
  },

  // Apply for leave
  apply: async (leaveData) => {
    const response = await api.post('/leaves/apply', leaveData)
    return response.data
  },

  // Update leave status (admin/HR only)
  updateStatus: async (id, status, comments) => {
    // Backend has separate approve and reject endpoints
    if (status === 'approved') {
      const response = await api.patch(`/leaves/${id}/approve`, { reviewComments: comments })
      return response.data
    } else if (status === 'rejected') {
      const response = await api.patch(`/leaves/${id}/reject`, { reviewComments: comments })
      return response.data
    }
    throw new Error('Invalid status. Use "approved" or "rejected"')
  },

  // Get pending leaves (admin/HR only)
  getPending: async () => {
    const response = await api.get('/leaves', { params: { status: 'pending' } })
    return response.data
  },
}

// Payroll API calls
export const payrollService = {
  // Get all payroll records (admin/HR only)
  getAll: async () => {
    const response = await api.get('/payroll')
    return response.data
  },

  // Get my payroll
  getMy: async () => {
    const response = await api.get('/payroll/my-payroll')
    return response.data
  },

  // Create/Update payroll (admin/HR only)
  createOrUpdate: async (employeeId, payrollData) => {
    // Backend expects employeeId in the body, not URL
    const response = await api.post('/payroll', { ...payrollData, employeeId })
    return response.data
  },

  // Get payroll by employee ID (admin/HR only)
  getByEmployeeId: async (employeeId) => {
    const response = await api.get(`/payroll/employee/${employeeId}`)
    return response.data
  },
}

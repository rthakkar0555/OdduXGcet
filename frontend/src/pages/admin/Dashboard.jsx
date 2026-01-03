import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { employeeService, attendanceService, leaveService } from '../../services/api'
import { Plus, Search, Users, Calendar, FileText, TrendingUp, Activity, Database } from 'lucide-react'
import EmployeeCard from '../../components/EmployeeCard'
import EmployeeDetailModal from '../../components/EmployeeDetailModal'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  
  // Dashboard statistics
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    pendingLeaves: 0,
    attendanceRate: 0
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEmployees(employees)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredEmployees(
        employees.filter(emp => {
          const name = emp?.personalDetails?.fullName?.toLowerCase() || ''
          const designation = emp?.jobDetails?.designation?.toLowerCase() || ''
          const department = emp?.jobDetails?.department?.toLowerCase() || ''
          return name.includes(query) || designation.includes(query) || department.includes(query)
        })
      )
    }
  }, [searchQuery, employees])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch employees with attendance
      const employeesRes = await employeeService.getAll({ withAttendance: true, limit: 100 })
      const employeesList = employeesRes.data?.employees || employeesRes.data || []
      setEmployees(employeesList)
      setFilteredEmployees(employeesList)
      
      // Calculate statistics
      const totalEmployees = employeesList.length
      const presentToday = employeesList.filter(emp => emp.todayStatus === 'present').length
      const absentToday = employeesList.filter(emp => emp.todayStatus === 'absent').length
      const attendanceRate = totalEmployees > 0 ? ((presentToday / totalEmployees) * 100).toFixed(1) : 0
      
      // Fetch pending leaves
      let pendingLeaves = 0
      try {
        const leavesRes = await leaveService.getAll({ status: 'pending' })
        const leaves = leavesRes.data?.leaves || leavesRes.data || []
        pendingLeaves = Array.isArray(leaves) ? leaves.length : 0
      } catch (error) {
        console.error('Failed to fetch pending leaves:', error)
      }
      
      setStats({
        totalEmployees,
        presentToday,
        absentToday,
        pendingLeaves,
        attendanceRate: parseFloat(attendanceRate)
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = async (employee) => {
    try {
      // Fetch full employee details
      const response = await employeeService.getById(employee._id)
      setSelectedEmployee(response.data)
    } catch (error) {
      console.error('Failed to fetch employee details:', error)
      // Still show modal with available data
      setSelectedEmployee(employee)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your organization</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">Active workforce</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.presentToday}</div>
              <p className="text-xs text-muted-foreground">Out of {stats.totalEmployees} employees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
              <p className="text-xs text-muted-foreground">Today's attendance</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Overview and System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Employees:</span>
                <span className="text-sm font-medium">{stats.totalEmployees}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Present Today:</span>
                <span className="text-sm font-medium text-green-600">{stats.presentToday}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Absent Today:</span>
                <span className="text-sm font-medium text-red-600">{stats.absentToday}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending Leave Requests:</span>
                <span className="text-sm font-medium text-orange-600">{stats.pendingLeaves}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">System Health:</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-green-600">Online</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Sync:</span>
                <span className="text-sm font-medium">Just now</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Database:</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-green-600">Connected</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employees Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Employees</h2>
              <p className="text-muted-foreground mt-1">View all employees and their status</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/admin/employees')}>
                <Plus className="h-4 w-4 mr-2" />
                NEW
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Employee Cards Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? 'No employees found matching your search.' : 'No employees found.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredEmployees.map((employee) => (
                <EmployeeCard
                  key={employee._id}
                  employee={employee}
                  onClick={() => handleCardClick(employee)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Employee Detail Modal */}
        {selectedEmployee && (
          <EmployeeDetailModal
            employee={selectedEmployee}
            onClose={() => setSelectedEmployee(null)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

export default AdminDashboard

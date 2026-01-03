import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { employeeService, attendanceService, leaveService } from '../../services/api'
import { Search, Clock } from 'lucide-react'
import { formatDate, formatTime } from '../../lib/utils'
import EmployeeCard from '../../components/EmployeeCard'
import EmployeeDetailModal from '../../components/EmployeeDetailModal'
import { useToast } from '../../components/ui/Toaster'

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const { toastSuccess, toastError } = useToast()
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)

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
      
      // Fetch today's attendance
      try {
        const attendanceRes = await attendanceService.getTodayStatus()
        setTodayAttendance(attendanceRes.data)
      } catch (error) {
        // If endpoint doesn't exist, that's okay
        console.log('Today status endpoint not available')
      }

      // Fetch all employees with attendance status
      const employeesRes = await employeeService.getAll({ withAttendance: true, limit: 100 })
      const employeesList = employeesRes.data?.employees || employeesRes.data || []
      setEmployees(employeesList)
      setFilteredEmployees(employeesList)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true)
      await attendanceService.checkIn()
      await fetchDashboardData()
      toastSuccess('Checked in successfully!')
    } catch (error) {
      console.error('Check-in failed:', error)
      toastError(error.response?.data?.message || 'Failed to check in', 'Check-in Failed')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    try {
      setCheckingIn(true)
      await attendanceService.checkOut()
      await fetchDashboardData()
      toastSuccess('Checked out successfully!')
    } catch (error) {
      console.error('Check-out failed:', error)
      toastError(error.response?.data?.message || 'Failed to check out', 'Check-out Failed')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCardClick = async (employee) => {
    try {
      const response = await employeeService.getById(employee._id)
      setSelectedEmployee(response.data)
    } catch (error) {
      console.error('Failed to fetch employee details:', error)
      setSelectedEmployee(employee)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.employeeProfile?.personalDetails?.fullName || 'User'}!</h1>
          <p className="text-muted-foreground mt-1">View all employees and manage your attendance</p>
        </div>

        {/* Check In/Out Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance
            </CardTitle>
            <CardDescription>Mark your attendance for today</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            {!todayAttendance?.checkIn ? (
              <Button onClick={handleCheckIn} disabled={checkingIn} className="bg-green-600 hover:bg-green-700">
                {checkingIn ? 'Processing...' : 'Check In →'}
              </Button>
            ) : !todayAttendance?.checkOut ? (
              <Button onClick={handleCheckOut} disabled={checkingIn} className="bg-red-600 hover:bg-red-700">
                {checkingIn ? 'Processing...' : 'Check Out →'}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">You've completed your attendance for today!</p>
                {todayAttendance?.checkIn && (
                  <span className="text-sm">Since {formatTime(todayAttendance.checkIn)}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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

export default EmployeeDashboard

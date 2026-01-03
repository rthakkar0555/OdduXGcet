import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { employeeService } from '../../services/api'
import { Plus, Search } from 'lucide-react'
import EmployeeCard from '../../components/EmployeeCard'
import EmployeeDetailModal from '../../components/EmployeeDetailModal'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  useEffect(() => {
    fetchEmployees()
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

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const response = await employeeService.getAll({ withAttendance: true, limit: 100 })
      const employeesList = response.data?.employees || response.data || []
      setEmployees(employeesList)
      setFilteredEmployees(employeesList)
    } catch (error) {
      console.error('Failed to fetch employees:', error)
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
        {/* Header with NEW button and Search */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Employees</h1>
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

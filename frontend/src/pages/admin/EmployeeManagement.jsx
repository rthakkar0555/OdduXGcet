import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { employeeService } from '../../services/api'
import { Users, Plus, X, Edit, Trash2 } from 'lucide-react'
import { formatDate } from '../../lib/utils'

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    designation: '',
    department: '',
    employmentType: 'full-time',
    joinDate: '',
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const response = await employeeService.getAll()
      setEmployees(response.data?.employees || response.data || [])
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      
      const employeeData = {
        personalDetails: {
          fullName: formData.fullName,
          phone: formData.phone,
        },
        jobDetails: {
          designation: formData.designation,
          department: formData.department,
          employmentType: formData.employmentType,
          joinDate: formData.joinDate,
        }
      }

      if (editingId) {
        await employeeService.update(editingId, employeeData)
      } else {
        await employeeService.create(employeeData)
      }

      setShowForm(false)
      setEditingId(null)
      setFormData({
        fullName: '',
        phone: '',
        designation: '',
        department: '',
        employmentType: 'full-time',
        joinDate: '',
      })
      await fetchEmployees()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save employee')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (employee) => {
    setEditingId(employee._id)
    setFormData({
      fullName: employee.personalDetails?.fullName || '',
      phone: employee.personalDetails?.phone || '',
      designation: employee.jobDetails?.designation || '',
      department: employee.jobDetails?.department || '',
      employmentType: employee.jobDetails?.employmentType || 'full-time',
      joinDate: employee.jobDetails?.joinDate ? new Date(employee.jobDetails.joinDate).toISOString().split('T')[0] : '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this employee?')) return
    
    try {
      await employeeService.delete(id)
      await fetchEmployees()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete employee')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Employee Management</h1>
            <p className="text-muted-foreground mt-1">Manage your organization's workforce</p>
          </div>
          <Button onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            setFormData({
              fullName: '',
              phone: '',
              designation: '',
              department: '',
              employmentType: 'full-time',
              joinDate: '',
            })
          }}>
            {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showForm ? 'Cancel' : 'Add Employee'}
          </Button>
        </div>

        {/* Employee Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Employee' : 'Add New Employee'}</CardTitle>
              <CardDescription>Fill in the employee details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation *</Label>
                    <Input
                      id="designation"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employmentType">Employment Type</Label>
                    <Select
                      id="employmentType"
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                    >
                      <option value="full-time">Full Time</option>
                      <option value="part-time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="joinDate">Join Date</Label>
                    <Input
                      id="joinDate"
                      type="date"
                      value={formData.joinDate}
                      onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : (editingId ? 'Update Employee' : 'Add Employee')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Employee List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Employees
            </CardTitle>
            <CardDescription>Total: {employees.length} employees</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee._id}>
                      <TableCell className="font-medium">
                        {employee.personalDetails?.fullName || 'N/A'}
                      </TableCell>
                      <TableCell>{employee.jobDetails?.designation || 'N/A'}</TableCell>
                      <TableCell>{employee.jobDetails?.department || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {employee.jobDetails?.employmentType || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {employee.jobDetails?.joinDate 
                          ? formatDate(employee.jobDetails.joinDate) 
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(employee._id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default EmployeeManagement

import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Select } from '../../components/ui/Select'
import { employeeService, payrollService } from '../../services/api'
import { DollarSign, Plus, X } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'

const PayrollManagement = () => {
  const [employees, setEmployees] = useState([])
  const [payrolls, setPayrolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    employeeId: '',
    basicSalary: '',
    hra: '',
    transport: '',
    medical: '',
    otherAllowance: '',
    tax: '',
    providentFund: '',
    otherDeduction: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [employeesRes, payrollsRes] = await Promise.all([
        employeeService.getAll(),
        payrollService.getAll()
      ])
      setEmployees(employeesRes.data?.employees || employeesRes.data || [])
      setPayrolls(payrollsRes.data?.payrolls || payrollsRes.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate net salary in real-time
  const calculateNetSalary = () => {
    const basicSalary = parseFloat(formData.basicSalary) || 0
    const totalAllowances = 
      (parseFloat(formData.hra) || 0) +
      (parseFloat(formData.transport) || 0) +
      (parseFloat(formData.medical) || 0) +
      (parseFloat(formData.otherAllowance) || 0)
    const totalDeductions = 
      (parseFloat(formData.tax) || 0) +
      (parseFloat(formData.providentFund) || 0) +
      (parseFloat(formData.otherDeduction) || 0)
    
    return Math.max(0, basicSalary + totalAllowances - totalDeductions)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      
      const payrollData = {
        basicSalary: parseFloat(formData.basicSalary),
        allowances: {
          hra: parseFloat(formData.hra) || 0,
          transport: parseFloat(formData.transport) || 0,
          medical: parseFloat(formData.medical) || 0,
          other: parseFloat(formData.otherAllowance) || 0,
        },
        deductions: {
          tax: parseFloat(formData.tax) || 0,
          providentFund: parseFloat(formData.providentFund) || 0,
          other: parseFloat(formData.otherDeduction) || 0,
        }
      }

      await payrollService.createOrUpdate(formData.employeeId, payrollData)
      
      setShowForm(false)
      setFormData({
        employeeId: '',
        basicSalary: '',
        hra: '',
        transport: '',
        medical: '',
        otherAllowance: '',
        tax: '',
        providentFund: '',
        otherDeduction: '',
      })
      await fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save payroll')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payroll Management</h1>
            <p className="text-muted-foreground mt-1">Manage employee salaries and compensation</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showForm ? 'Cancel' : 'Add Payroll'}
          </Button>
        </div>

        {/* Payroll Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create/Update Payroll</CardTitle>
              <CardDescription>Set salary details for an employee</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Select Employee *</Label>
                  <Select
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    required
                  >
                    <option value="">Choose an employee...</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.personalDetails?.fullName || 'Unknown'} - {emp.jobDetails?.designation || 'N/A'}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="basicSalary">Basic Salary (₹) *</Label>
                    <Input
                      id="basicSalary"
                      type="number"
                      value={formData.basicSalary}
                      onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hra">HRA (₹)</Label>
                    <Input
                      id="hra"
                      type="number"
                      value={formData.hra}
                      onChange={(e) => setFormData({ ...formData, hra: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transport">Transport Allowance (₹)</Label>
                    <Input
                      id="transport"
                      type="number"
                      value={formData.transport}
                      onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medical">Medical Allowance (₹)</Label>
                    <Input
                      id="medical"
                      type="number"
                      value={formData.medical}
                      onChange={(e) => setFormData({ ...formData, medical: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax">Tax (₹)</Label>
                    <Input
                      id="tax"
                      type="number"
                      value={formData.tax}
                      onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="providentFund">Provident Fund (₹)</Label>
                    <Input
                      id="providentFund"
                      type="number"
                      value={formData.providentFund}
                      onChange={(e) => setFormData({ ...formData, providentFund: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otherAllowance">Other Allowances (₹)</Label>
                    <Input
                      id="otherAllowance"
                      type="number"
                      value={formData.otherAllowance}
                      onChange={(e) => setFormData({ ...formData, otherAllowance: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otherDeduction">Other Deductions (₹)</Label>
                    <Input
                      id="otherDeduction"
                      type="number"
                      value={formData.otherDeduction}
                      onChange={(e) => setFormData({ ...formData, otherDeduction: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="netSalary">Net Salary (₹) *</Label>
                    <Input
                      id="netSalary"
                      type="number"
                      value={calculateNetSalary().toFixed(2)}
                      readOnly
                      className="bg-muted font-semibold text-green-600 cursor-not-allowed"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Calculated automatically: Basic Salary + Allowances - Deductions
                    </p>
                  </div>
                </div>

                <Button type="submit" disabled={submitting || !formData.basicSalary || !formData.employeeId}>
                  {submitting ? 'Saving...' : 'Save Payroll'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Payroll List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Employee Payrolls
            </CardTitle>
            <CardDescription>Total: {payrolls.length} payroll records</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : payrolls.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payroll records found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((payroll) => {
                    const totalAllowances = 
                      (payroll.allowances?.hra || 0) +
                      (payroll.allowances?.transport || 0) +
                      (payroll.allowances?.medical || 0)
                    
                    const totalDeductions =
                      (payroll.deductions?.tax || 0) +
                      (payroll.deductions?.providentFund || 0)

                    return (
                      <TableRow key={payroll._id}>
                        <TableCell className="font-medium">
                          {payroll.employee?.personalDetails?.fullName || 'N/A'}
                        </TableCell>
                        <TableCell>{formatCurrency(payroll.basicSalary)}</TableCell>
                        <TableCell>{formatCurrency(totalAllowances)}</TableCell>
                        <TableCell className="text-red-600">{formatCurrency(totalDeductions)}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(payroll.netSalary)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default PayrollManagement

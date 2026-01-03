import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { payrollService } from '../../services/api'
import { DollarSign, TrendingUp, Calendar } from 'lucide-react'
import { formatCurrency, formatDate } from '../../lib/utils'

const Payroll = () => {
  const [payroll, setPayroll] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayroll()
  }, [])

  const fetchPayroll = async () => {
    try {
      setLoading(true)
      const response = await payrollService.getMy()
      // API response structure: { statusCode, data, message, success }
      setPayroll(response.data || response)
    } catch (error) {
      console.error('Failed to fetch payroll:', error)
      // If it's a 404, it means payroll doesn't exist for this user
      // This is expected if payroll hasn't been set up yet
      if (error.response?.status === 404) {
        setPayroll(null)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p>Loading payroll information...</p>
      </DashboardLayout>
    )
  }

  if (!payroll) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No payroll information available. Please contact HR.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  const totalAllowances = 
    (payroll.allowances?.hra || 0) +
    (payroll.allowances?.transport || 0) +
    (payroll.allowances?.medical || 0) +
    (payroll.allowances?.other || 0)

  const totalDeductions =
    (payroll.deductions?.tax || 0) +
    (payroll.deductions?.providentFund || 0) +
    (payroll.deductions?.other || 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-muted-foreground mt-1">View your salary details and breakdown</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Basic Salary</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(payroll.basicSalary)}</div>
              <p className="text-xs text-muted-foreground mt-1">Per month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Allowances</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAllowances)}</div>
              <p className="text-xs text-muted-foreground mt-1">Additional benefits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Salary</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(payroll.netSalary)}</div>
              <p className="text-xs text-muted-foreground mt-1">Take home</p>
            </CardContent>
          </Card>
        </div>

        {/* Salary Breakdown */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Earnings */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings</CardTitle>
              <CardDescription>Your salary components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Basic Salary</span>
                <span className="font-medium">{formatCurrency(payroll.basicSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">HRA</span>
                <span className="font-medium">{formatCurrency(payroll.allowances?.hra || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Transport Allowance</span>
                <span className="font-medium">{formatCurrency(payroll.allowances?.transport || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Medical Allowance</span>
                <span className="font-medium">{formatCurrency(payroll.allowances?.medical || 0)}</span>
              </div>
              {payroll.allowances?.other > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">Other Allowances</span>
                  <span className="font-medium">{formatCurrency(payroll.allowances.other)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t font-semibold">
                <span>Gross Salary</span>
                <span>{formatCurrency(payroll.basicSalary + totalAllowances)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Deductions */}
          <Card>
            <CardHeader>
              <CardTitle>Deductions</CardTitle>
              <CardDescription>Taxes and other deductions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Income Tax</span>
                <span className="font-medium">{formatCurrency(payroll.deductions?.tax || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Provident Fund</span>
                <span className="font-medium">{formatCurrency(payroll.deductions?.providentFund || 0)}</span>
              </div>
              {payroll.deductions?.other > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">Other Deductions</span>
                  <span className="font-medium">{formatCurrency(payroll.deductions.other)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t font-semibold">
                <span>Total Deductions</span>
                <span className="text-red-600">{formatCurrency(totalDeductions)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t font-bold text-lg">
                <span>Net Salary</span>
                <span className="text-green-600">{formatCurrency(payroll.netSalary)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Payroll Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Effective From</span>
              <span className="font-medium">{formatDate(payroll.effectiveFrom)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Currency</span>
              <span className="font-medium">{payroll.currency}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default Payroll

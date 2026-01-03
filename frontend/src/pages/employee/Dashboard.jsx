import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { attendanceService, leaveService } from '../../services/api'
import { Calendar, Clock, FileText, TrendingUp } from 'lucide-react'
import { formatDate, formatTime } from '../../lib/utils'

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [recentLeaves, setRecentLeaves] = useState([])
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalLeaves: 0,
    pendingLeaves: 0,
  })
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch today's attendance
      const attendanceRes = await attendanceService.getTodayStatus()
      setTodayAttendance(attendanceRes.data)

      // Fetch recent leaves
      const leavesRes = await leaveService.getMy()
      const leaves = leavesRes.data?.leaves || leavesRes.data || []
      setRecentLeaves(leaves.slice(0, 5))

      // Calculate stats
      const pendingCount = leaves.filter(l => l.status === 'pending').length
      setStats({
        totalPresent: 0, // You can calculate this from attendance history
        totalLeaves: leaves.length,
        pendingLeaves: pendingCount,
      })
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
    } catch (error) {
      console.error('Check-in failed:', error)
      alert(error.response?.data?.message || 'Failed to check in')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    try {
      setCheckingIn(true)
      await attendanceService.checkOut()
      await fetchDashboardData()
    } catch (error) {
      console.error('Check-out failed:', error)
      alert(error.response?.data?.message || 'Failed to check out')
    } finally {
      setCheckingIn(false)
    }
  }

  const getLeaveStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'destructive',
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.employeeProfile?.personalDetails?.fullName || 'User'}!</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your work today.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Status</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {todayAttendance?.status || 'Not Marked'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {todayAttendance?.checkIn && `In: ${formatTime(todayAttendance.checkIn)}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leaves</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeaves}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingLeaves} pending approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPresent}</div>
              <p className="text-xs text-muted-foreground mt-1">Days present</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">95%</div>
              <p className="text-xs text-muted-foreground mt-1">Attendance rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your attendance for today</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            {!todayAttendance?.checkIn ? (
              <Button onClick={handleCheckIn} disabled={checkingIn}>
                {checkingIn ? 'Processing...' : 'Check In'}
              </Button>
            ) : !todayAttendance?.checkOut ? (
              <Button onClick={handleCheckOut} disabled={checkingIn}>
                {checkingIn ? 'Processing...' : 'Check Out'}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">You've completed your attendance for today!</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Leaves */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Leave Requests</CardTitle>
            <CardDescription>Your latest leave applications</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLeaves.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leave requests yet.</p>
            ) : (
              <div className="space-y-4">
                {recentLeaves.map((leave) => (
                  <div key={leave._id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{leave.leaveType} Leave</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)} ({leave.totalDays} days)
                      </p>
                    </div>
                    {getLeaveStatusBadge(leave.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default EmployeeDashboard

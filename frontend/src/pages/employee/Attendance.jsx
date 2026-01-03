import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { attendanceService } from '../../services/api'
import { Calendar, Clock } from 'lucide-react'
import { formatDate, formatTime, calculateWorkHours } from '../../lib/utils'

const Attendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [todayStatus, setTodayStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchAttendance()
  }, [])

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      const [recordsRes, todayRes] = await Promise.all([
        attendanceService.getMy(),
        attendanceService.getTodayStatus()
      ])
      
      setAttendanceRecords(recordsRes.data?.attendance || recordsRes.data || [])
      setTodayStatus(todayRes.data)
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    try {
      setActionLoading(true)
      await attendanceService.checkIn()
      await fetchAttendance()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to check in')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOut = async () => {
    try {
      setActionLoading(true)
      await attendanceService.checkOut()
      await fetchAttendance()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to check out')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      present: 'success',
      absent: 'destructive',
      'half-day': 'warning',
      leave: 'secondary',
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground mt-1">Track your daily attendance and work hours</p>
        </div>

        {/* Today's Attendance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Attendance
            </CardTitle>
            <CardDescription>{formatDate(new Date())}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayStatus ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    {getStatusBadge(todayStatus.status)}
                  </div>
                  
                  {todayStatus.checkIn && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Check In:</span>
                      <span className="text-sm">{formatTime(todayStatus.checkIn)}</span>
                    </div>
                  )}
                  
                  {todayStatus.checkOut && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Check Out:</span>
                      <span className="text-sm">{formatTime(todayStatus.checkOut)}</span>
                    </div>
                  )}
                  
                  {todayStatus.workHours > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Work Hours:</span>
                      <span className="text-sm font-semibold">{todayStatus.workHours.toFixed(2)} hrs</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attendance marked for today</p>
              )}

              <div className="flex gap-3 pt-2">
                {!todayStatus?.checkIn ? (
                  <Button onClick={handleCheckIn} disabled={actionLoading}>
                    <Clock className="h-4 w-4 mr-2" />
                    {actionLoading ? 'Processing...' : 'Check In'}
                  </Button>
                ) : !todayStatus?.checkOut ? (
                  <Button onClick={handleCheckOut} disabled={actionLoading} variant="outline">
                    <Clock className="h-4 w-4 mr-2" />
                    {actionLoading ? 'Processing...' : 'Check Out'}
                  </Button>
                ) : (
                  <p className="text-sm text-green-600 font-medium">✓ Attendance completed for today</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance History */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
            <CardDescription>Your past attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : attendanceRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance records found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Work Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record._id}>
                      <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
                      <TableCell>{record.checkIn ? formatTime(record.checkIn) : '-'}</TableCell>
                      <TableCell>{record.checkOut ? formatTime(record.checkOut) : '-'}</TableCell>
                      <TableCell>{record.workHours ? `${record.workHours.toFixed(2)} hrs` : '-'}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
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

export default Attendance

import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'
import { Label } from '../../components/ui/Label'
import { leaveService } from '../../services/api'
import { FileText, Check, X } from 'lucide-react'
import { formatDate } from '../../lib/utils'

const LeaveApprovals = () => {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [reviewComments, setReviewComments] = useState({})

  useEffect(() => {
    fetchLeaves()
  }, [])

  const fetchLeaves = async () => {
    try {
      setLoading(true)
      const response = await leaveService.getAll()
      setLeaves(response.data?.leaves || response.data || [])
    } catch (error) {
      console.error('Failed to fetch leaves:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (leaveId, status) => {
    try {
      setProcessingId(leaveId)
      const comments = reviewComments[leaveId] || ''
      await leaveService.updateStatus(leaveId, status, comments)
      await fetchLeaves()
      setReviewComments({ ...reviewComments, [leaveId]: '' })
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update leave status')
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'destructive',
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  const pendingLeaves = leaves.filter(l => l.status === 'pending')
  const processedLeaves = leaves.filter(l => l.status !== 'pending')

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leave Approvals</h1>
          <p className="text-muted-foreground mt-1">Review and approve employee leave requests</p>
        </div>

        {/* Pending Leaves */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pending Approvals ({pendingLeaves.length})
            </CardTitle>
            <CardDescription>Leave requests awaiting your decision</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingLeaves.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending leave requests</p>
            ) : (
              <div className="space-y-4">
                {pendingLeaves.map((leave) => (
                  <div key={leave._id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">
                          {leave.employee?.personalDetails?.fullName || 'Unknown Employee'}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {leave.leaveType} Leave • {leave.totalDays} days
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                        </p>
                      </div>
                      {getStatusBadge(leave.status)}
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Reason:</p>
                      <p className="text-sm text-muted-foreground">{leave.reason}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`comments-${leave._id}`}>Review Comments (Optional)</Label>
                      <Textarea
                        id={`comments-${leave._id}`}
                        value={reviewComments[leave._id] || ''}
                        onChange={(e) => setReviewComments({ ...reviewComments, [leave._id]: e.target.value })}
                        placeholder="Add any comments..."
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(leave._id, 'approved')}
                        disabled={processingId === leave._id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusUpdate(leave._id, 'rejected')}
                        disabled={processingId === leave._id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processed Leaves */}
        <Card>
          <CardHeader>
            <CardTitle>Processed Leaves</CardTitle>
            <CardDescription>Previously reviewed leave requests</CardDescription>
          </CardHeader>
          <CardContent>
            {processedLeaves.length === 0 ? (
              <p className="text-sm text-muted-foreground">No processed leaves</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedLeaves.map((leave) => (
                    <TableRow key={leave._id}>
                      <TableCell className="font-medium">
                        {leave.employee?.personalDetails?.fullName || 'N/A'}
                      </TableCell>
                      <TableCell className="capitalize">{leave.leaveType}</TableCell>
                      <TableCell>
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </TableCell>
                      <TableCell>{leave.totalDays}</TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>
                      <TableCell>
                        {leave.reviewedOn ? formatDate(leave.reviewedOn) : '-'}
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

export default LeaveApprovals

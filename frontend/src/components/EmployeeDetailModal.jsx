import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar'
import { Button } from './ui/Button'
import { X, Mail, Phone, MapPin, Briefcase, Calendar, CheckCircle2, Plane, AlertCircle } from 'lucide-react'
import { getImageUrl } from '../utils/imageUtils'

const EmployeeDetailModal = ({ employee, onClose }) => {
  if (!employee) return null

  const profilePicturePath = employee?.personalDetails?.profilePicture
  const profilePicture = getImageUrl(profilePicturePath)
  const emoji = employee?.personalDetails?.emoji
  const fullName = employee?.personalDetails?.fullName || 'Unknown'
  const email = employee?.user?.email || 'N/A'
  const phone = employee?.personalDetails?.phone || 'N/A'
  const address = employee?.personalDetails?.address || 'N/A'
  const designation = employee?.jobDetails?.designation || 'Not Assigned'
  const department = employee?.jobDetails?.department || 'Not Assigned'
  const employmentType = employee?.jobDetails?.employmentType || 'N/A'
  const joiningDate = employee?.jobDetails?.joiningDate 
    ? new Date(employee.jobDetails.joiningDate).toLocaleDateString() 
    : 'N/A'
  const todayStatus = employee?.todayStatus || 'absent'

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Present</span>
          </div>
        )
      case 'on-leave':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <Plane className="w-4 h-4" />
            <span className="text-sm font-medium">On Leave</span>
          </div>
        )
      case 'absent':
      default:
        return (
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Absent</span>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Employee Details</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Section */}
          <div className="flex flex-col items-center text-center space-y-4">
            {profilePicture ? (
              <Avatar className="w-24 h-24">
                <AvatarImage src={profilePicture} alt={fullName} />
                <AvatarFallback>{fullName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            ) : emoji ? (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-5xl shadow-md">
                {emoji}
              </div>
            ) : (
              <Avatar className="w-24 h-24">
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white text-3xl font-bold">
                  {fullName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h2 className="text-2xl font-bold">{fullName}</h2>
              <p className="text-muted-foreground">{designation}</p>
              {getStatusBadge(todayStatus)}
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Personal Information</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{address}</span>
              </div>
            </div>
          </div>

          {/* Job Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Job Information</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Designation:</span>
                  <span className="text-sm ml-2">{designation}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Department:</span>
                  <span className="text-sm ml-2">{department}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Employment Type:</span>
                  <span className="text-sm ml-2 capitalize">{employmentType}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Joining Date:</span>
                  <span className="text-sm ml-2">{joiningDate}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EmployeeDetailModal


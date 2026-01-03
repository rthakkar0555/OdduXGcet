import { Card, CardContent } from './ui/Card'
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar'
import { CheckCircle2, Plane, AlertCircle } from 'lucide-react'
import { getImageUrl } from '../utils/imageUtils'

const EmployeeCard = ({ employee, onClick }) => {
  // Determine status indicator
  const getStatusIndicator = (status) => {
    switch (status) {
      case 'present':
        return (
          <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm" 
               title="Present" />
        )
      case 'on-leave':
        return (
          <div className="absolute top-2 right-2" title="On Leave">
            <Plane className="w-4 h-4 text-blue-500" />
          </div>
        )
      case 'absent':
      default:
        return (
          <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white shadow-sm" 
               title="Absent" />
        )
    }
  }

  const profilePicturePath = employee?.personalDetails?.profilePicture
  const profilePicture = getImageUrl(profilePicturePath)
  const emoji = employee?.personalDetails?.emoji
  const fullName = employee?.personalDetails?.fullName || 'Unknown'
  const designation = employee?.jobDetails?.designation || 'Not Assigned'
  const todayStatus = employee?.todayStatus || 'absent'

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow relative"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Status Indicator */}
        {getStatusIndicator(todayStatus)}
        
        {/* Profile Picture/Emoji */}
        <div className="flex justify-center mb-3">
          {profilePicture ? (
            <Avatar className="w-20 h-20">
              <AvatarImage src={profilePicture} alt={fullName} />
              <AvatarFallback>{fullName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          ) : emoji ? (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-4xl shadow-md">
              {emoji}
            </div>
          ) : (
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white text-2xl font-bold">
                {fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Employee Name */}
        <h3 className="text-center font-semibold text-lg mb-1 truncate" title={fullName}>
          {fullName}
        </h3>

        {/* Designation */}
        <p className="text-center text-sm text-muted-foreground truncate" title={designation}>
          {designation}
        </p>
      </CardContent>
    </Card>
  )
}

export default EmployeeCard


import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  LayoutDashboard, Users, Calendar, FileText, DollarSign, 
  LogOut, User, Settings, Menu, X, ChevronDown
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar'
import { getImageUrl } from '../utils/imageUtils'

const Sidebar = () => {
  const location = useLocation()
  const { user, logout, isAdmin, isHR } = useAuth()
  const navigate = useNavigate()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/signin')
  }

  const employeeNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Attendance', path: '/attendance', icon: Calendar },
    { name: 'Leaves', path: '/leaves', icon: FileText },
    { name: 'Payroll', path: '/payroll', icon: DollarSign },
  ]

  const adminNavItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Employees', path: '/admin/employees', icon: Users },
    { name: 'Attendance', path: '/admin/attendance', icon: Calendar },
    { name: 'Time Off', path: '/admin/leaves', icon: FileText },
    { name: 'Payroll', path: '/admin/payroll', icon: DollarSign },
  ]

  const navItems = (isAdmin || isHR) ? adminNavItems : employeeNavItems

  const profilePicturePath = user?.employeeProfile?.personalDetails?.profilePicture
  const profilePicture = getImageUrl(profilePicturePath)
  const emoji = user?.employeeProfile?.personalDetails?.emoji
  const fullName = user?.employeeProfile?.personalDetails?.fullName || 'User'

  const NavContent = () => (
    <>
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold">Dayflow</h1>
        <p className="text-xs text-muted-foreground mt-1">HRMS Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        {/* User Profile with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-md hover:bg-accent transition-colors"
          >
            {profilePicture ? (
              <Avatar className="w-10 h-10">
                <AvatarImage src={profilePicture} alt={fullName} />
                <AvatarFallback>{fullName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            ) : emoji ? (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xl">
                {emoji}
              </div>
            ) : (
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {fullName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user?.role}</p>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", showProfileDropdown && "rotate-180")} />
          </button>

          {/* Dropdown Menu */}
          {showProfileDropdown && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border rounded-md shadow-lg z-50">
              <Link
                to="/profile"
                onClick={() => setShowProfileDropdown(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors"
              >
                <User className="h-4 w-4" />
                My Profile
              </Link>
              <button
                onClick={() => {
                  setShowProfileDropdown(false)
                  handleLogout()
                }}
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-background border shadow-sm"
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="fixed inset-y-0 left-0 w-72 bg-background border-r shadow-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:border-r lg:bg-background">
        <NavContent />
      </div>
    </>
  )
}

export default Sidebar

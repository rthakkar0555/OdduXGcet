import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Button } from '../../components/ui/Button'
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/Avatar'
import { employeeService } from '../../services/api'
import { User, Mail, Phone, MapPin, Briefcase, Upload, X, Camera } from 'lucide-react'
import { getImageUrl } from '../../utils/imageUtils'
import { useToast } from '../../components/ui/Toaster'

const Profile = () => {
  const { toastSuccess, toastError, toastWarning } = useToast()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    emoji: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await employeeService.getMyProfile()
      setProfile(response.data)
      
      // Populate form data
      const personal = response.data?.personalDetails || {}
      setFormData({
        fullName: personal.fullName || '',
        phone: personal.phone || '',
        address: personal.address || '',
        city: personal.city || '',
        state: personal.state || '',
        pincode: personal.pincode || '',
        emoji: personal.emoji || '',
      })
      setPreviewImage(null) // Reset preview when fetching profile
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await employeeService.update(null, {
        personalDetails: formData
      })
      setEditing(false)
      await fetchProfile()
      toastSuccess('Profile updated successfully')
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toastError('Please select an image file', 'Invalid File Type')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toastError('Image size should be less than 5MB', 'File Too Large')
        return
      }
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadPicture = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      toastWarning('Please select an image file', 'No File Selected')
      return
    }

    try {
      setUploading(true)
      const response = await employeeService.uploadProfilePicture(file)
      console.log('Upload response:', response)
      setPreviewImage(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await fetchProfile()
      toastSuccess('Profile picture uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message || 
                           'Failed to upload profile picture. Please try again.'
      toastError(errorMessage, 'Upload Failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePicture = async () => {
    // Use a custom confirmation dialog instead of browser confirm
    const confirmed = window.confirm('Are you sure you want to remove your profile picture?')
    if (!confirmed) {
      return
    }
    try {
      setUploading(true)
      await employeeService.update(null, {
        personalDetails: { profilePicture: null }
      })
      setPreviewImage(null)
      await fetchProfile()
      toastSuccess('Profile picture removed successfully!')
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to remove profile picture', 'Remove Failed')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p>Loading profile...</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground mt-1">View and manage your personal information</p>
          </div>
          {!editing && (
            <Button onClick={() => setEditing(true)}>Edit Profile</Button>
          )}
        </div>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Profile Picture Upload Section */}
            <div className="mb-6 pb-6 border-b">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-6 mt-3">
                {/* Current/Preview Profile Picture */}
                <div className="relative">
                  {previewImage || (profile?.personalDetails?.profilePicture && getImageUrl(profile.personalDetails.profilePicture)) ? (
                    <Avatar className="w-24 h-24">
                      <AvatarImage 
                        src={previewImage || getImageUrl(profile?.personalDetails?.profilePicture)} 
                        alt="Profile" 
                      />
                      <AvatarFallback>
                        {profile?.personalDetails?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ) : profile?.personalDetails?.emoji ? (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-4xl shadow-md">
                      {profile.personalDetails.emoji}
                    </div>
                  ) : (
                    <Avatar className="w-24 h-24">
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-400 text-white text-3xl font-bold">
                        {profile?.personalDetails?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="profilePicture"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {previewImage ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    {previewImage && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleUploadPicture}
                        disabled={uploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Save Photo'}
                      </Button>
                    )}
                    {profile?.personalDetails?.profilePicture && !previewImage && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemovePicture}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  {previewImage && (
                    <p className="text-xs text-muted-foreground">
                      Click "Save Photo" to upload this image to Cloudinary
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Supported formats: JPG, PNG, GIF (Max 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Emoji/Avatar Selection */}
            {editing && (
              <div className="space-y-2 mb-4">
                <Label htmlFor="emoji">Choose Emoji/Avatar</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="emoji"
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                    placeholder="😀 or paste emoji here"
                    maxLength={2}
                    className="w-32"
                  />
                  <div className="flex gap-2">
                    {['😀', '😊', '🤔', '😎', '🥳', '👨‍💼', '👩‍💼', '🧑‍💻', '👨‍🔬', '👩‍🎨'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, emoji })}
                        className="text-2xl hover:scale-125 transition-transform p-1"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Select an emoji to use as your avatar (if no photo uploaded)</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={!editing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!editing}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!editing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={!editing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  disabled={!editing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  disabled={!editing}
                />
              </div>
            </div>

            {editing && (
              <div className="flex gap-3 mt-6">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => {
                  setEditing(false)
                  fetchProfile()
                }}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Information
            </CardTitle>
            <CardDescription>Your employment details (read-only)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Designation</Label>
                <p className="font-medium mt-1">{profile?.jobDetails?.designation || 'Not assigned'}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Department</Label>
                <p className="font-medium mt-1">{profile?.jobDetails?.department || 'Not assigned'}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Employment Type</Label>
                <p className="font-medium mt-1 capitalize">{profile?.jobDetails?.employmentType || 'Not specified'}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Join Date</Label>
                <p className="font-medium mt-1">
                  {profile?.jobDetails?.joinDate 
                    ? new Date(profile.jobDetails.joinDate).toLocaleDateString() 
                    : 'Not specified'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default Profile

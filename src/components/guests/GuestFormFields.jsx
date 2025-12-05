// src/components/guests/GuestFormFields.jsx
// Shared guest form component used across the application
import { useRef } from 'react'
import { User, Upload, Star, Home } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

/**
 * GuestFormFields - Reusable guest form component
 *
 * @param {Object} props
 * @param {Object} props.guestDetails - Form data object with guest fields
 * @param {Function} props.onChange - Callback when any field changes: (updatedDetails) => void
 * @param {boolean} props.isEditing - If true, show inputs. If false, show read-only display
 * @param {boolean} props.showPhoto - Show photo upload section (default: true)
 * @param {Array} props.roomOptions - Optional array of room options for dropdown [{id, label}]
 * @param {string} props.selectedRoom - Currently selected room ID
 * @param {Function} props.onRoomChange - Callback when room selection changes
 * @param {Object} props.dropdownOptions - Dropdown data { idProofTypes, genderOptions, nationalities }
 * @param {string} props.primaryLabel - Optional label to show (e.g., "Primary Guest")
 * @param {boolean} props.showGuestType - Show Adult/Child/Infant selector (for new bookings)
 */
export default function GuestFormFields({
  guestDetails,
  onChange,
  isEditing = true,
  showPhoto = true,
  roomOptions = [],
  selectedRoom = '',
  onRoomChange,
  dropdownOptions = {},
  primaryLabel = null,
  showGuestType = false,
}) {
  const fileInputRef = useRef(null)
  const { idProofTypes = [], genderOptions = [], nationalities = [] } = dropdownOptions

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should not exceed 5MB')
        return
      }
      const photoUrl = URL.createObjectURL(file)
      onChange({
        ...guestDetails,
        photo: file,
        photoUrl
      })
    }
  }

  const handleRemovePhoto = () => {
    if (guestDetails.photoUrl && guestDetails.photo) {
      URL.revokeObjectURL(guestDetails.photoUrl)
    }
    onChange({
      ...guestDetails,
      photo: null,
      photoUrl: null
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const updateField = (field, value) => {
    onChange({ ...guestDetails, [field]: value })
  }

  // Get display name for header
  const displayName = guestDetails.firstName || guestDetails.surname
    ? `${guestDetails.firstName || ''} ${guestDetails.surname || ''}`.trim()
    : 'Guest'

  return (
    <div>
      {/* Photo Section */}
      {showPhoto && (
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Photo Preview */}
            <div className="relative flex-shrink-0">
              {guestDetails.photoUrl ? (
                <img
                  src={guestDetails.photoUrl}
                  alt="Guest"
                  className="w-16 h-16 object-cover rounded-md border-2 border-border"
                />
              ) : (
                <div className="w-16 h-16 bg-muted rounded-md border-2 border-dashed border-border flex items-center justify-center">
                  <User className="w-7 h-7 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-sm font-semibold">{displayName}</Label>
                {primaryLabel && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-info/20 text-info rounded-full">
                    {primaryLabel}
                  </span>
                )}
              </div>
              {isEditing && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      {guestDetails.photoUrl ? 'Change' : 'Upload'}
                    </Button>
                    {guestDetails.photoUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemovePhoto}
                        className="h-8"
                      >
                        Remove
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground">Max 5MB</span>
                  </div>
                </>
              )}
            </div>

            {/* Room Assignment Dropdown */}
            {roomOptions.length > 0 && (
              <div className="flex-shrink-0 border-l pl-4">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  <Home className="w-3 h-3 inline mr-1" />
                  Room Assignment
                </Label>
                {isEditing ? (
                  <Select
                    value={selectedRoom || 'unassigned'}
                    onValueChange={(value) => onRoomChange?.(value === 'unassigned' ? '' : value)}
                  >
                    <SelectTrigger className="h-9 w-[200px]">
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">No room assigned</SelectItem>
                      {roomOptions.map(room => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm py-2">
                    {selectedRoom ? roomOptions.find(r => r.id === selectedRoom)?.label || 'Unknown' : 'No room assigned'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="p-4">
        {/* Personal Information Section */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Personal Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName" className="text-xs">First Name *</Label>
              {isEditing ? (
                <Input
                  id="firstName"
                  value={guestDetails.firstName || ''}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  placeholder="John"
                  className="h-9"
                />
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.firstName || '-'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="surname" className="text-xs">Surname *</Label>
              {isEditing ? (
                <Input
                  id="surname"
                  value={guestDetails.surname || ''}
                  onChange={(e) => updateField('surname', e.target.value)}
                  placeholder="Doe"
                  className="h-9"
                />
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.surname || '-'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs">Phone</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  type="tel"
                  value={guestDetails.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="9876543210"
                  className="h-9"
                />
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.phone || '-'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">Email</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={guestDetails.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="john@example.com"
                  className="h-9"
                />
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.email || '-'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="dateOfBirth" className="text-xs">Date of Birth</Label>
              {isEditing ? (
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={guestDetails.dateOfBirth || ''}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  className="h-9"
                />
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.dateOfBirth || '-'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="gender" className="text-xs">Gender</Label>
              {isEditing ? (
                <Select
                  value={guestDetails.gender || ''}
                  onValueChange={(value) => updateField('gender', value)}
                >
                  <SelectTrigger id="gender" className="h-9">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map(gender => (
                      <SelectItem key={gender} value={gender}>{gender}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.gender || '-'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="nationality" className="text-xs">Nationality</Label>
              {isEditing ? (
                <Select
                  value={guestDetails.nationality || ''}
                  onValueChange={(value) => updateField('nationality', value)}
                >
                  <SelectTrigger id="nationality" className="h-9">
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    {nationalities.map(nationality => (
                      <SelectItem key={nationality} value={nationality}>{nationality}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.nationality || '-'}
                </div>
              )}
            </div>

            {showGuestType && isEditing && (
              <div className="space-y-1">
                <Label htmlFor="guestType" className="text-xs">Guest Type *</Label>
                <Select
                  value={guestDetails.guestType || 'Adult'}
                  onValueChange={(value) => updateField('guestType', value)}
                >
                  <SelectTrigger id="guestType" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Adult">Adult</SelectItem>
                    <SelectItem value="Child">Child</SelectItem>
                    <SelectItem value="Infant">Infant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* ID Proof Section */}
        <div className="mb-4 pt-4 border-t">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">ID Proof</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="idType" className="text-xs">ID Type</Label>
              {isEditing ? (
                <Select
                  value={guestDetails.idType || 'N/A'}
                  onValueChange={(value) => updateField('idType', value)}
                >
                  <SelectTrigger id="idType" className="h-9">
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N/A">None</SelectItem>
                    {idProofTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.idType || '-'}
                </div>
              )}
            </div>

            <div className="space-y-1 md:col-span-1 lg:col-span-2">
              <Label htmlFor="idNumber" className="text-xs">ID Number</Label>
              {isEditing ? (
                <Input
                  id="idNumber"
                  value={guestDetails.idNumber || ''}
                  onChange={(e) => updateField('idNumber', e.target.value)}
                  placeholder="Enter ID number"
                  className="h-9"
                />
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.idNumber || '-'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="pt-4 border-t">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1 md:col-span-2 lg:col-span-3">
              <Label htmlFor="address" className="text-xs">Street Address</Label>
              {isEditing ? (
                <Input
                  id="address"
                  value={guestDetails.address || ''}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="123 Main Street"
                  className="h-9"
                />
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.address || '-'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs">City</Label>
              {isEditing ? (
                <Input
                  id="city"
                  value={guestDetails.city || ''}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Mumbai"
                  className="h-9"
                />
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.city || '-'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="state" className="text-xs">State</Label>
              {isEditing ? (
                <Input
                  id="state"
                  value={guestDetails.state || ''}
                  onChange={(e) => updateField('state', e.target.value)}
                  placeholder="Maharashtra"
                  className="h-9"
                />
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.state || '-'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="country" className="text-xs">Country</Label>
              {isEditing ? (
                <Input
                  id="country"
                  value={guestDetails.country || ''}
                  onChange={(e) => updateField('country', e.target.value)}
                  placeholder="India"
                  className="h-9"
                />
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.country || '-'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="pt-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="emergencyContactName" className="text-xs">Contact Name</Label>
              {isEditing ? (
                <Input
                  id="emergencyContactName"
                  value={guestDetails.emergencyContactName || ''}
                  onChange={(e) => updateField('emergencyContactName', e.target.value)}
                  placeholder="Emergency contact name"
                  className="h-9"
                />
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.emergencyContactName || '-'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="emergencyContactPhone" className="text-xs">Contact Phone</Label>
              {isEditing ? (
                <Input
                  id="emergencyContactPhone"
                  type="tel"
                  value={guestDetails.emergencyContactPhone || ''}
                  onChange={(e) => updateField('emergencyContactPhone', e.target.value)}
                  placeholder="Emergency contact phone"
                  className="h-9"
                />
              ) : (
                <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                  {guestDetails.emergencyContactPhone || '-'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* VIP Status Section */}
        <div className="pt-4">
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <Checkbox
                  id="isVip"
                  checked={guestDetails.isVip || false}
                  onCheckedChange={(checked) => updateField('isVip', checked)}
                />
                <Label htmlFor="isVip" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  <Star className="w-4 h-4 text-warning" />
                  VIP Guest
                </Label>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Star className={`w-4 h-4 ${guestDetails.isVip ? 'text-warning fill-warning' : 'text-muted-foreground'}`} />
                <span className="text-sm">
                  {guestDetails.isVip ? 'VIP Guest' : 'Regular Guest'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

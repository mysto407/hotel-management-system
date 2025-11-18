import { useState, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Upload, User, Search, UserPlus, Mail, Phone } from 'lucide-react'
import { useReservationFlow } from '../../context/ReservationFlowContext'
import { useGuests } from '../../context/GuestContext'
import { useAlert } from '@/context/AlertContext'
import StepIndicator from '../../components/reservations/StepIndicator'
import { AddGuestModal } from '../../components/guests/AddGuestModal'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'

export default function GuestDetailsPage({ onNavigate }) {
  const flowContext = useReservationFlow()
  const guestContext = useGuests()
  const { error: showError, success: showSuccess, warning: showWarning, info: showInfo } = useAlert()
  const fileInputRef = useRef(null)
  const [errors, setErrors] = useState({})
  const [guestSearch, setGuestSearch] = useState('')
  const [selectedGuestId, setSelectedGuestId] = useState(null)
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false)

  const { guestDetails, setGuestDetails, selectedRooms } = flowContext
  const { idProofTypes, guests } = guestContext

  // Filter guests based on search
  const filteredGuests = useMemo(() => {
    if (!guestSearch) return guests
    const search = guestSearch.toLowerCase()
    return guests.filter(guest =>
      guest.name?.toLowerCase().includes(search) ||
      guest.email?.toLowerCase().includes(search) ||
      guest.phone?.includes(search)
    )
  }, [guests, guestSearch])

  // Redirect if no rooms selected
  if (!selectedRooms || selectedRooms.length === 0) {
    return (
      <div className="h-full flex flex-col bg-accent">
        <div className="bg-card border-b px-6 py-4">
          <h1 className="text-2xl font-bold">Guest Details</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 bg-card rounded-lg shadow">
            <p className="text-muted-foreground mb-4 text-lg">No rooms selected. Please start from the beginning.</p>
            <Button onClick={() => onNavigate('new-reservation')} size="lg">
              Go to Room Selection
            </Button>
          </div>
        </div>
      </div>
    )
  }

const handleSelectGuest = (guest) => {
    // Prevent duplicate selection
    if (selectedGuestId === guest.id) {
      return
    }

    setSelectedGuestId(guest.id)

    // Split name into firstName and surname
    const nameParts = (guest.name || '').trim().split(' ')
    const firstName = nameParts[0] || ''
    const surname = nameParts.slice(1).join(' ') || ''

    setGuestDetails({
      id: guest.id,
      firstName,
      surname,
      email: guest.email || '',
      phone: guest.phone || '',
      idType: guest.id_proof_type || 'N/A',
      idNumber: guest.id_proof_number || '',
      address: guest.address || '',
      city: guest.city || '',
      state: guest.state || '',
      country: guest.country || '',
      photo: null, // Clear any pending photo file
      photoUrl: guest.photo_url || null
    })
  }

  const handleNewGuest = () => {
    setIsAddGuestModalOpen(true)
  }

  const handleGuestAdded = (newGuest) => {
    // When a guest is added via the modal, select them automatically
    handleSelectGuest(newGuest)
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('File size should not exceed 5MB')
        return
      }

      // Create preview URL
      const photoUrl = URL.createObjectURL(file)
      setGuestDetails({
        ...guestDetails,
        photo: file,
        photoUrl
      })
    }
  }

  const handleRemovePhoto = () => {
    if (guestDetails.photoUrl) {
      URL.revokeObjectURL(guestDetails.photoUrl)
    }
    setGuestDetails({
      ...guestDetails,
      photo: null,
      photoUrl: null
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!guestDetails.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!guestDetails.surname.trim()) {
      newErrors.surname = 'Surname is required'
    }

    // Optional: Validate email format only if provided
    if (guestDetails.email && !/\S+@\S+\.\S+/.test(guestDetails.email)) {
      newErrors.email = 'Email is invalid'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleProceed = () => {
    if (validateForm()) {
      onNavigate('payment')
    }
  }

  return (
    <div className="h-full flex flex-col bg-accent">
      {/* Header */}
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Guest Details</h1>
          <StepIndicator currentStep={2} />
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Guest Selection */}
        <div className="w-80 bg-card border-r flex flex-col">
          <div className="p-4 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search guests..."
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={handleNewGuest}
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 flex-shrink-0"
                title="Add New Guest"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Guest List - Scrollable with max height */}
          <div className="flex-1 overflow-y-auto min-h-0 max-h-[calc(65vh)]">
            {filteredGuests.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {guestSearch ? 'No guests found' : 'No saved guests'}
              </div>
            ) : (
              <div className="divide-y">
                {filteredGuests.map(guest => (
                  <button
                    key={guest.id}
                    onClick={() => handleSelectGuest(guest)}
                    className={`w-full text-left p-4 hover:bg-muted/30 transition-colors ${
                      selectedGuestId === guest.id ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 dark:border-blue-400' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        {guest.photo_url ? (
                          <img
                            src={guest.photo_url}
                            alt={guest.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{guest.name}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Phone className="w-3 h-3" />
                          <span className="truncate">{guest.phone}</span>
                        </div>
                        {guest.email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{guest.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Content - Guest Form */}
        <div className="flex-1 overflow-y-auto bg-card">
          <div className="p-4">
            {/* Single Unified Card with All Information */}
            <div className="bg-card border rounded-lg shadow-sm">
              {/* Photo Section - Ultra Compact */}
              <div className="border-b bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-4">
                  {/* Smaller Photo Preview */}
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

                  {/* Upload Controls - Inline Compact */}
                  <div className="flex-1">
                    <Label className="text-sm font-semibold mb-1 block">
                      {guestDetails.firstName || guestDetails.surname
                        ? `${guestDetails.firstName} ${guestDetails.surname}`.trim()
                        : 'Guest Photo'}
                    </Label>
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
                  </div>
                </div>
              </div>

              {/* Form Fields - Compact Grid Layout */}
              <div className="p-4">
                {/* Personal Information Section */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Personal Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="firstName" className="text-xs">First Name *</Label>
                      <Input
                        id="firstName"
                        value={guestDetails.firstName}
                        onChange={(e) => setGuestDetails({ ...guestDetails, firstName: e.target.value })}
                        placeholder="John"
                        className={`h-9 ${errors.firstName ? 'border-red-500 dark:border-red-400' : ''}`}
                      />
                      {errors.firstName && <p className="text-xs text-red-500 dark:text-red-400">{errors.firstName}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="surname" className="text-xs">Surname *</Label>
                      <Input
                        id="surname"
                        value={guestDetails.surname}
                        onChange={(e) => setGuestDetails({ ...guestDetails, surname: e.target.value })}
                        placeholder="Doe"
                        className={`h-9 ${errors.surname ? 'border-red-500 dark:border-red-400' : ''}`}
                      />
                      {errors.surname && <p className="text-xs text-red-500 dark:text-red-400">{errors.surname}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-xs">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={guestDetails.phone}
                        onChange={(e) => setGuestDetails({ ...guestDetails, phone: e.target.value })}
                        placeholder="9876543210"
                        className={`h-9 ${errors.phone ? 'border-red-500 dark:border-red-400' : ''}`}
                      />
                      {errors.phone && <p className="text-xs text-red-500 dark:text-red-400">{errors.phone}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-xs">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={guestDetails.email}
                        onChange={(e) => setGuestDetails({ ...guestDetails, email: e.target.value })}
                        placeholder="john@example.com"
                        className={`h-9 ${errors.email ? 'border-red-500 dark:border-red-400' : ''}`}
                      />
                      {errors.email && <p className="text-xs text-red-500 dark:text-red-400">{errors.email}</p>}
                    </div>
                  </div>
                </div>

                {/* ID Proof Section */}
                <div className="mb-4 pt-4 border-t">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">ID Proof</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="idType" className="text-xs">ID Type</Label>
                      <Select
                        value={guestDetails.idType}
                        onValueChange={(value) => setGuestDetails({ ...guestDetails, idType: value })}
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
                    </div>

                    <div className="space-y-1 md:col-span-1 lg:col-span-2">
                      <Label htmlFor="idNumber" className="text-xs">ID Number</Label>
                      <Input
                        id="idNumber"
                        value={guestDetails.idNumber}
                        onChange={(e) => setGuestDetails({ ...guestDetails, idNumber: e.target.value })}
                        placeholder="Enter ID number"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="pt-4 border-t">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1 md:col-span-2 lg:col-span-3">
                      <Label htmlFor="address" className="text-xs">Street Address</Label>
                      <Input
                        id="address"
                        value={guestDetails.address}
                        onChange={(e) => setGuestDetails({ ...guestDetails, address: e.target.value })}
                        placeholder="123 Main Street"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="city" className="text-xs">City</Label>
                      <Input
                        id="city"
                        value={guestDetails.city}
                        onChange={(e) => setGuestDetails({ ...guestDetails, city: e.target.value })}
                        placeholder="Mumbai"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="state" className="text-xs">State</Label>
                      <Input
                        id="state"
                        value={guestDetails.state}
                        onChange={(e) => setGuestDetails({ ...guestDetails, state: e.target.value })}
                        placeholder="Maharashtra"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="country" className="text-xs">Country</Label>
                      <Input
                        id="country"
                        value={guestDetails.country}
                        onChange={(e) => setGuestDetails({ ...guestDetails, country: e.target.value })}
                        placeholder="India"
                        className="h-9"
                      />
                    </div>


                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Navigation */}
      <div className="sticky bottom-0 z-10 bg-card border-t px-4 py-3 shadow-lg">
        <div className="flex justify-between items-center gap-4">
          <Button
            onClick={() => onNavigate('new-reservation')}
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleProceed}
          >
            Proceed to Payment
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Add Guest Modal */}
      <AddGuestModal
        isOpen={isAddGuestModalOpen}
        onClose={() => setIsAddGuestModalOpen(false)}
        onGuestAdded={handleGuestAdded}
      />
    </div>
  )
}

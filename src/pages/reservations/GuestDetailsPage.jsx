import { useState, useRef, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Upload, User, Search, UserPlus, Mail, Phone, X, Users, Star } from 'lucide-react'
import { useReservationFlow } from '../../context/ReservationFlowContext'
import { useGuests } from '../../context/GuestContext'
import { useRooms } from '../../context/RoomContext'
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
import { Checkbox } from '../../components/ui/checkbox'

export default function GuestDetailsPage({ onNavigate }) {
  const flowContext = useReservationFlow()
  const guestContext = useGuests()
  const roomContext = useRooms()
  const { error: showError, success: showSuccess, warning: showWarning, info: showInfo } = useAlert()
  const fileInputRef = useRef(null)
  const [guestSearch, setGuestSearch] = useState('')
  const [selectedGuestId, setSelectedGuestId] = useState(null)
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false)
  const [currentGuestIndex, setCurrentGuestIndex] = useState(0)

  const {
    guestDetails,
    setGuestDetails,
    allGuestsDetails,
    setAllGuestsDetails,
    selectedRooms,
    addToExistingBooking
  } = flowContext
  const { idProofTypes, genderOptions, guests } = guestContext
  const { rooms } = roomContext

  // Check if we're adding to an existing booking
  const isAddingToExisting = !!addToExistingBooking

  // Pre-select existing guest when adding to existing booking
  useEffect(() => {
    if (isAddingToExisting && addToExistingBooking.guestId && guests.length > 0) {
      const existingGuest = guests.find(g => g.id === addToExistingBooking.guestId)
      if (existingGuest && selectedGuestId !== existingGuest.id) {
        // Auto-select the guest from the existing booking
        setSelectedGuestId(existingGuest.id)

        const nameParts = (existingGuest.name || '').trim().split(' ')
        const firstName = nameParts[0] || ''
        const surname = nameParts.slice(1).join(' ') || ''

        setGuestDetails({
          id: existingGuest.id,
          firstName,
          surname,
          email: existingGuest.email || '',
          phone: existingGuest.phone || '',
          dateOfBirth: existingGuest.date_of_birth || '',
          idType: existingGuest.id_proof_type || 'N/A',
          idNumber: existingGuest.id_proof_number || '',
          address: existingGuest.address || '',
          city: existingGuest.city || '',
          state: existingGuest.state || '',
          country: existingGuest.country || '',
          photo: null,
          photoUrl: existingGuest.photo_url || null,
          assignedRoomId: '',
          gender: existingGuest.gender || '',
          nationality: existingGuest.nationality || '',
          emergencyContactName: existingGuest.emergency_contact_name || '',
          emergencyContactPhone: existingGuest.emergency_contact_phone || '',
          isVip: existingGuest.is_vip || false
        })
      }
    }
  }, [isAddingToExisting, addToExistingBooking, guests, selectedGuestId, setGuestDetails])

  // Reset guest index when component mounts or when allGuestsDetails is empty
  useEffect(() => {
    if (allGuestsDetails.length === 0) {
      setCurrentGuestIndex(0)
    }
  }, [allGuestsDetails.length])

  // Calculate total number of guests from selected rooms
  const totalGuestsCount = useMemo(() => {
    if (!selectedRooms || selectedRooms.length === 0) return 1

    let total = 0
    selectedRooms.forEach(room => {
      room.guestCounts?.forEach(guestCount => {
        total += (guestCount.adults || 0) + (guestCount.children || 0)
      })
    })

    // Default to at least 1 guest if no counts are set
    return total > 0 ? total : 1
  }, [selectedRooms])

  // Get all booked rooms for dropdown
  const bookedRoomsList = useMemo(() => {
    if (!selectedRooms || selectedRooms.length === 0 || !rooms) return []

    const bookedRooms = []
    selectedRooms.forEach(roomType => {
      // Add each assigned room
      roomType.assignedRooms?.forEach((roomId, index) => {
        if (roomId) {
          // Find the actual room data to get room number
          const roomData = rooms.find(r => r.id === roomId)
          const roomNumber = roomData?.room_number || roomId

          bookedRooms.push({
            id: roomId,
            label: `${roomType.room_type_name || roomType.name} - Room ${roomNumber}`,
            roomNumber: roomNumber,
            roomTypeName: roomType.room_type_name || roomType.name,
            cartKey: roomType.cartKey,
            index
          })
        }
      })
    })
    return bookedRooms
  }, [selectedRooms, rooms])

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
      dateOfBirth: guest.date_of_birth || '',
      idType: guest.id_proof_type || 'N/A',
      idNumber: guest.id_proof_number || '',
      address: guest.address || '',
      city: guest.city || '',
      state: guest.state || '',
      country: guest.country || '',
      photo: null, // Clear any pending photo file
      photoUrl: guest.photo_url || null,
      assignedRoomId: '',
      gender: guest.gender || '',
      nationality: guest.nationality || '',
      emergencyContactName: guest.emergency_contact_name || '',
      emergencyContactPhone: guest.emergency_contact_phone || '',
      isVip: guest.is_vip || false
    })
  }

  const handleNewGuest = () => {
    setIsAddGuestModalOpen(true)
  }

  const handleGuestAdded = (newGuest) => {
    // When a guest is added via the modal, select them automatically
    handleSelectGuest(newGuest)
  }

  const handleClearForm = () => {
    setSelectedGuestId(null)
    setGuestDetails({
      id: null,
      firstName: '',
      surname: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      idType: 'N/A',
      idNumber: '',
      address: '',
      city: '',
      state: '',
      country: '',
      photo: null,
      photoUrl: null,
      assignedRoomId: '',
      gender: '',
      nationality: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      isVip: false
    })
  }

  const handleNextGuest = () => {
    if (currentGuestIndex < totalGuestsCount - 1) {
      // Save current guest details
      const updatedGuests = [...allGuestsDetails]
      updatedGuests[currentGuestIndex] = { ...guestDetails }
      setAllGuestsDetails(updatedGuests)

      // Move to next guest
      const nextIndex = currentGuestIndex + 1
      setCurrentGuestIndex(nextIndex)

      // Load next guest details or clear form
      if (updatedGuests[nextIndex]) {
        setGuestDetails(updatedGuests[nextIndex])
      } else {
        handleClearForm()
      }
    }
  }

  const handlePreviousGuest = () => {
    if (currentGuestIndex > 0) {
      // Save current guest details
      const updatedGuests = [...allGuestsDetails]
      updatedGuests[currentGuestIndex] = { ...guestDetails }
      setAllGuestsDetails(updatedGuests)

      // Move to previous guest
      const prevIndex = currentGuestIndex - 1
      setCurrentGuestIndex(prevIndex)

      // Load previous guest details
      if (updatedGuests[prevIndex]) {
        setGuestDetails(updatedGuests[prevIndex])
      }
    }
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

  const handleProceed = () => {
    // Save current guest details first
    const updatedGuests = [...allGuestsDetails]
    updatedGuests[currentGuestIndex] = { ...guestDetails }

    // Validate that at least the primary guest (index 0) has required fields
    const primaryGuest = updatedGuests[0] || guestDetails

    if (!primaryGuest.firstName?.trim() || !primaryGuest.surname?.trim()) {
      showError('Primary guest name is required. Please fill in the first guest details.')
      return
    }

    // Validate email format only if provided
    if (guestDetails.email && !/\S+@\S+\.\S+/.test(guestDetails.email)) {
      showError('Please enter a valid email address')
      return
    }

    // Save all guest details including current one
    setAllGuestsDetails(updatedGuests)

    // Navigate to payment
    onNavigate('payment')
  }

  return (
    <div className="h-full flex flex-col bg-accent">
      {/* Add to Existing Booking Banner */}
      {isAddingToExisting && (
        <div className="bg-info/10 border-b border-info/30 px-6 py-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-info" />
            <span className="text-sm text-info">
              Adding room to existing booking for <strong>{addToExistingBooking.guestName || 'Guest'}</strong>
              {' '}- Guest details pre-filled
            </span>
          </div>
        </div>
      )}

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

          {/* Saved Guests Label */}
          <div className="px-4 pt-3 pb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Saved Guests
            </h3>
          </div>

          {/* Guest List - Scrollable with max height */}
          <div className="flex-1 overflow-y-auto min-h-0 max-h-[calc(68vh)]">
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
                      selectedGuestId === guest.id ? 'bg-info/10 border-l-4 border-info' : ''
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
              {/* Form Header with Guest Navigation and Clear Button */}
              <div className="flex items-center justify-between border-b bg-muted/10 px-4 py-2.5">
                <div className="flex items-center gap-3 flex-wrap">
                  {totalGuestsCount > 1 && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span className="font-medium">
                          Guest {currentGuestIndex + 1} of {totalGuestsCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={handlePreviousGuest}
                          disabled={currentGuestIndex === 0}
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Previous Guest"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={handleNextGuest}
                          disabled={currentGuestIndex === totalGuestsCount - 1}
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Next Guest"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {currentGuestIndex > 0 && (
                        <div className="text-xs text-muted-foreground italic border-l pl-3">
                          Optional - Can be added later in reservation details
                        </div>
                      )}
                    </>
                  )}
                </div>
                <Button
                  onClick={handleClearForm}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-muted-foreground hover:text-foreground"
                  title="Clear Form"
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Clear
                </Button>
              </div>

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
                    <div className="flex items-center gap-2 mb-1">
                      <Label className="text-sm font-semibold">
                        {guestDetails.firstName || guestDetails.surname
                          ? `${guestDetails.firstName} ${guestDetails.surname}`.trim()
                          : 'Guest Photo'}
                      </Label>
                      {currentGuestIndex === 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-info/20 text-info rounded-full">
                          Primary Guest
                        </span>
                      )}
                    </div>
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

                  {/* Room Assignment Dropdown */}
                  {bookedRoomsList.length > 0 && (
                    <div className="flex-shrink-0 border-l pl-4">
                      <Label className="text-xs text-muted-foreground mb-2 block">Room Assignment</Label>
                      <Select
                        value={guestDetails.assignedRoomId || 'unassigned'}
                        onValueChange={(value) => setGuestDetails({ ...guestDetails, assignedRoomId: value === 'unassigned' ? '' : value })}
                      >
                        <SelectTrigger className="h-9 w-[200px]">
                          <SelectValue placeholder="Select room" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">No room assigned</SelectItem>
                          {bookedRoomsList.map(room => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Fields - Compact Grid Layout */}
              <div className="p-4">
                {/* Personal Information Section */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Personal Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="firstName" className="text-xs">
                        First Name {currentGuestIndex === 0 && '*'}
                      </Label>
                      <Input
                        id="firstName"
                        value={guestDetails.firstName}
                        onChange={(e) => setGuestDetails({ ...guestDetails, firstName: e.target.value })}
                        placeholder="John"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="surname" className="text-xs">
                        Surname {currentGuestIndex === 0 && '*'}
                      </Label>
                      <Input
                        id="surname"
                        value={guestDetails.surname}
                        onChange={(e) => setGuestDetails({ ...guestDetails, surname: e.target.value })}
                        placeholder="Doe"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-xs">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={guestDetails.phone}
                        onChange={(e) => setGuestDetails({ ...guestDetails, phone: e.target.value })}
                        placeholder="9876543210"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-xs">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={guestDetails.email}
                        onChange={(e) => setGuestDetails({ ...guestDetails, email: e.target.value })}
                        placeholder="john@example.com"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="dateOfBirth" className="text-xs">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={guestDetails.dateOfBirth}
                        onChange={(e) => setGuestDetails({ ...guestDetails, dateOfBirth: e.target.value })}
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="gender" className="text-xs">Gender</Label>
                      <Select
                        value={guestDetails.gender}
                        onValueChange={(value) => setGuestDetails({ ...guestDetails, gender: value })}
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
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="nationality" className="text-xs">Nationality</Label>
                      <Input
                        id="nationality"
                        value={guestDetails.nationality}
                        onChange={(e) => setGuestDetails({ ...guestDetails, nationality: e.target.value })}
                        placeholder="Indian"
                        className="h-9"
                      />
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

                {/* Emergency Contact Section */}
                <div className="pt-4 border-t">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="emergencyContactName" className="text-xs">Contact Name</Label>
                      <Input
                        id="emergencyContactName"
                        value={guestDetails.emergencyContactName}
                        onChange={(e) => setGuestDetails({ ...guestDetails, emergencyContactName: e.target.value })}
                        placeholder="Emergency contact name"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="emergencyContactPhone" className="text-xs">Contact Phone</Label>
                      <Input
                        id="emergencyContactPhone"
                        type="tel"
                        value={guestDetails.emergencyContactPhone}
                        onChange={(e) => setGuestDetails({ ...guestDetails, emergencyContactPhone: e.target.value })}
                        placeholder="Emergency contact phone"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* VIP Status Section */}
                <div className="pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isVip"
                      checked={guestDetails.isVip}
                      onCheckedChange={(checked) => setGuestDetails({ ...guestDetails, isVip: checked })}
                    />
                    <Label htmlFor="isVip" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                      <Star className="w-4 h-4 text-warning" />
                      VIP Guest
                    </Label>
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

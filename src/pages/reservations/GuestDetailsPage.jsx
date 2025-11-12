import { useState, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Upload, User, Search, UserPlus, Mail, Phone } from 'lucide-react'
import { useReservationFlow } from '../../context/ReservationFlowContext'
import { useGuests } from '../../context/GuestContext'
import StepIndicator from '../../components/reservations/StepIndicator'
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
  const fileInputRef = useRef(null)
  const [errors, setErrors] = useState({})
  const [guestSearch, setGuestSearch] = useState('')
  const [selectedGuestId, setSelectedGuestId] = useState(null)
  const [showNewGuest, setShowNewGuest] = useState(true)

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
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl font-bold">Guest Details</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4 text-lg">No rooms selected. Please start from the beginning.</p>
            <Button onClick={() => onNavigate('new-reservation')} size="lg">
              Go to Room Selection
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleSelectGuest = (guest) => {
    setSelectedGuestId(guest.id)
    setShowNewGuest(false)
    setGuestDetails({
      ...guestDetails,
      name: guest.name || '',
      email: guest.email || '',
      phone: guest.phone || '',
      idType: guest.id_proof_type || 'N/A',
      idNumber: guest.id_proof_number || '',
      address: guest.address || '',
      city: guest.city || '',
      state: guest.state || '',
      country: guest.country || '',
      pincode: guest.pincode || '',
      photo: null,
      photoUrl: guest.photo_url || null
    })
  }

  const handleNewGuest = () => {
    setSelectedGuestId(null)
    setShowNewGuest(true)
    setGuestDetails({
      name: '',
      email: '',
      phone: '',
      idType: 'N/A',
      idNumber: '',
      address: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
      photo: null,
      photoUrl: null
    })
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should not exceed 5MB')
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

    if (!guestDetails.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!guestDetails.phone.trim()) {
      newErrors.phone = 'Phone is required'
    }

    if (!guestDetails.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(guestDetails.email)) {
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Guest Details</h1>
          <StepIndicator currentStep={2} />
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Guest Selection */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <Button
                onClick={handleNewGuest}
                variant={showNewGuest ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                New Guest
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search guests..."
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Guest List */}
          <div className="flex-1 overflow-y-auto">
            {filteredGuests.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {guestSearch ? 'No guests found' : 'No saved guests'}
              </div>
            ) : (
              <div className="divide-y">
                {filteredGuests.map(guest => (
                  <button
                    key={guest.id}
                    onClick={() => handleSelectGuest(guest)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      selectedGuestId === guest.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {guest.photo_url ? (
                          <img
                            src={guest.photo_url}
                            alt={guest.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{guest.name}</div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <Phone className="w-3 h-3" />
                          <span className="truncate">{guest.phone}</span>
                        </div>
                        {guest.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
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
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              {/* Photo Upload Section */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <Label className="text-base font-semibold mb-4 block">Guest Photo</Label>
                <div className="flex items-start gap-6">
                  {/* Photo Preview */}
                  <div className="relative">
                    {guestDetails.photoUrl ? (
                      <img
                        src={guestDetails.photoUrl}
                        alt="Guest"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <User className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1">
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
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {guestDetails.photoUrl ? 'Change Photo' : 'Upload Photo'}
                      </Button>
                      {guestDetails.photoUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemovePhoto}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Accepts JPG, PNG. Max size 5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={guestDetails.name}
                      onChange={(e) => setGuestDetails({ ...guestDetails, name: e.target.value })}
                      placeholder="John Doe"
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={guestDetails.phone}
                      onChange={(e) => setGuestDetails({ ...guestDetails, phone: e.target.value })}
                      placeholder="9876543210"
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={guestDetails.email}
                      onChange={(e) => setGuestDetails({ ...guestDetails, email: e.target.value })}
                      placeholder="john@example.com"
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                  </div>
                </div>
              </div>

              {/* ID Proof Information */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">ID Proof</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="idType">ID Proof Type</Label>
                    <Select
                      value={guestDetails.idType}
                      onValueChange={(value) => setGuestDetails({ ...guestDetails, idType: value })}
                    >
                      <SelectTrigger id="idType">
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

                  <div className="space-y-2">
                    <Label htmlFor="idNumber">ID Proof Number</Label>
                    <Input
                      id="idNumber"
                      value={guestDetails.idNumber}
                      onChange={(e) => setGuestDetails({ ...guestDetails, idNumber: e.target.value })}
                      placeholder="ID Number"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      value={guestDetails.address}
                      onChange={(e) => setGuestDetails({ ...guestDetails, address: e.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={guestDetails.city}
                      onChange={(e) => setGuestDetails({ ...guestDetails, city: e.target.value })}
                      placeholder="Mumbai"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={guestDetails.state}
                      onChange={(e) => setGuestDetails({ ...guestDetails, state: e.target.value })}
                      placeholder="Maharashtra"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={guestDetails.country}
                      onChange={(e) => setGuestDetails({ ...guestDetails, country: e.target.value })}
                      placeholder="India"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={guestDetails.pincode}
                      onChange={(e) => setGuestDetails({ ...guestDetails, pincode: e.target.value })}
                      placeholder="400001"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Navigation */}
      <div className="bg-white border-t px-6 py-4">
        <div className="flex justify-between">
          <Button
            onClick={() => onNavigate('new-reservation')}
            variant="outline"
            size="lg"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleProceed}
            size="lg"
          >
            Proceed to Payment
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}

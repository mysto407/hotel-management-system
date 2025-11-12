import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Upload, User } from 'lucide-react'
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
  const { guestDetails, setGuestDetails } = useReservationFlow()
  const { idProofTypes } = useGuests()
  const fileInputRef = useRef(null)

  const [errors, setErrors] = useState({})

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

    if (guestDetails.adults < 1) {
      newErrors.adults = 'At least 1 adult is required'
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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Guest Details</h1>
          <StepIndicator currentStep={2} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow p-6">
            {/* Photo Upload Section */}
            <div className="mb-6 pb-6 border-b">
              <Label className="text-base font-semibold mb-3 block">Guest Photo</Label>
              <div className="flex items-start gap-4">
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
                  <div className="space-y-2">
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
                        className="ml-2"
                      >
                        Remove
                      </Button>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Accepts JPG, PNG. Max size 5MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Information Form */}
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
                    <SelectItem value="">None</SelectItem>
                    {idProofTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="idNumber">ID Proof Number</Label>
                <Input
                  id="idNumber"
                  value={guestDetails.idNumber}
                  onChange={(e) => setGuestDetails({ ...guestDetails, idNumber: e.target.value })}
                  placeholder="ID Number"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
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

              {/* Guest Count */}
              <div className="md:col-span-2 pt-4 border-t">
                <h3 className="font-semibold mb-3">Number of Guests</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adults">Adults *</Label>
                    <Input
                      id="adults"
                      type="number"
                      min="1"
                      value={guestDetails.adults}
                      onChange={(e) => setGuestDetails({ ...guestDetails, adults: parseInt(e.target.value) || 1 })}
                      className={errors.adults ? 'border-red-500' : ''}
                    />
                    {errors.adults && <p className="text-sm text-red-500">{errors.adults}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="children">Children</Label>
                    <Input
                      id="children"
                      type="number"
                      min="0"
                      value={guestDetails.children}
                      onChange={(e) => setGuestDetails({ ...guestDetails, children: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="infants">Infants</Label>
                    <Input
                      id="infants"
                      type="number"
                      min="0"
                      value={guestDetails.infants}
                      onChange={(e) => setGuestDetails({ ...guestDetails, infants: parseInt(e.target.value) || 0 })}
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

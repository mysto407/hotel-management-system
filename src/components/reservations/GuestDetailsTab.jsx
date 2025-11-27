import { useState, useRef } from 'react'
import { User, Mail, Phone, UserPlus, Edit, Save, X, Upload, Home } from 'lucide-react'
import { useGuests } from '../../context/GuestContext'
import { useReservations } from '../../context/ReservationContext'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

export default function GuestDetailsTab({ groupedReservations, guests, getRoomInfo }) {
  const { idProofTypes, updateGuest, addGuest } = useGuests()
  const { updateReservation } = useReservations()
  const [selectedGuestId, setSelectedGuestId] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isAddingNewGuest, setIsAddingNewGuest] = useState(false)
  const [editedGuestDetails, setEditedGuestDetails] = useState(null)
  const [selectedRoomForGuest, setSelectedRoomForGuest] = useState('')
  const fileInputRef = useRef(null)

  // Get all guests including placeholders for missing ones
  const getAllGuestsWithPlaceholders = () => {
    const existingGuests = []
    const placeholders = []
    let placeholderId = 1

    groupedReservations.forEach((reservation) => {
      const roomInfo = getRoomInfo(reservation.room_id, reservation.room_type_id)

      // Calculate expected guest count for this reservation
      const expectedGuestCount =
        (reservation.number_of_adults || 0) +
        (reservation.number_of_children || 0)

      // Track existing guests for this reservation
      const guestsInThisReservation = []

      // Add primary guest
      if (reservation.guest_id) {
        const guest = guests.find(g => g.id === reservation.guest_id)
        if (guest) {
          const guestEntry = {
            ...guest,
            isPrimary: true,
            isPlaceholder: false,
            assignedRoomNumber: roomInfo.number,
            assignedRoomType: roomInfo.type,
            assignedRoomId: reservation.room_id,
            reservationId: reservation.id
          }

          // Only add if not already in existingGuests
          if (!existingGuests.find(g => g.id === guest.id)) {
            existingGuests.push(guestEntry)
            guestsInThisReservation.push(guestEntry)
          }
        }
      }

      // Add additional guests
      const additionalGuestIds = reservation.additional_guest_ids || []
      if (Array.isArray(additionalGuestIds) && additionalGuestIds.length > 0) {
        additionalGuestIds.forEach(guestId => {
          const guest = guests.find(g => g.id === guestId)
          if (guest && !existingGuests.find(g => g.id === guest.id)) {
            const guestEntry = {
              ...guest,
              isPrimary: false,
              isPlaceholder: false,
              assignedRoomNumber: roomInfo.number,
              assignedRoomType: roomInfo.type,
              assignedRoomId: reservation.room_id,
              reservationId: reservation.id
            }
            existingGuests.push(guestEntry)
            guestsInThisReservation.push(guestEntry)
          }
        })
      }

      // Calculate how many placeholder guests are needed for this reservation
      const missingGuestCount = expectedGuestCount - guestsInThisReservation.length

      // Create placeholders for missing guests
      for (let i = 0; i < missingGuestCount; i++) {
        placeholders.push({
          id: `placeholder-${placeholderId++}`,
          name: 'Guest details not added',
          isPrimary: false,
          isPlaceholder: true,
          assignedRoomNumber: roomInfo.number,
          assignedRoomType: roomInfo.type,
          assignedRoomId: reservation.room_id,
          reservationId: reservation.id
        })
      }
    })

    return [...existingGuests, ...placeholders]
  }

  const allGuests = getAllGuestsWithPlaceholders()
  const selectedGuest = selectedGuestId && !selectedGuestId.startsWith('placeholder-')
    ? guests.find(g => g.id === selectedGuestId)
    : null
  const selectedPlaceholder = selectedGuestId && selectedGuestId.startsWith('placeholder-')
    ? allGuests.find(g => g.id === selectedGuestId)
    : null

  // Parse guest name into firstName and surname
  const parseGuestName = (name) => {
    const nameParts = (name || '').trim().split(' ')
    return {
      firstName: nameParts[0] || '',
      surname: nameParts.slice(1).join(' ') || ''
    }
  }

  const handleSelectGuest = (guest) => {
    if (guest.isPlaceholder) {
      // Handle placeholder selection - start adding a new guest
      setSelectedGuestId(guest.id)
      setIsEditMode(false)
      setIsAddingNewGuest(true)
      setSelectedRoomForGuest(guest.assignedRoomId || '')
      setEditedGuestDetails({
        firstName: '',
        surname: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        guestType: 'Adult',
        idType: 'N/A',
        idNumber: '',
        address: '',
        city: '',
        state: '',
        country: '',
        photo: null,
        photoUrl: null,
        placeholderReservationId: guest.reservationId
      })
    } else {
      // Handle real guest selection
      setSelectedGuestId(guest.id)
      setIsEditMode(false)
      setIsAddingNewGuest(false)
      setEditedGuestDetails(null)
      // Set the room assignment for this guest
      setSelectedRoomForGuest(guest.assignedRoomId || '')
    }
  }

  const handleAddGuestClick = () => {
    setSelectedGuestId(null)
    setIsEditMode(false)
    setIsAddingNewGuest(true)
    setSelectedRoomForGuest('')
    setEditedGuestDetails({
      firstName: '',
      surname: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      guestType: 'Adult',
      idType: 'N/A',
      idNumber: '',
      address: '',
      city: '',
      state: '',
      country: '',
      photo: null,
      photoUrl: null
    })
  }

  const handleRoomAssignmentChange = async (newRoomId) => {
    if (!selectedGuestId) return

    try {
      // Find current reservation where this guest is assigned
      const currentReservation = groupedReservations.find(r =>
        r.guest_id === selectedGuestId ||
        (r.additional_guest_ids && r.additional_guest_ids.includes(selectedGuestId))
      )

      // Find the new reservation to assign to
      const newReservation = groupedReservations.find(r => r.room_id === newRoomId)

      if (!newReservation) {
        setSelectedRoomForGuest(newRoomId)
        return
      }

      // If this guest is the primary guest of a reservation, don't allow reassignment
      if (currentReservation && currentReservation.guest_id === selectedGuestId) {
        alert('Cannot reassign primary guest. They are the main guest for their room.')
        return
      }

      // Remove from current reservation if it exists and guest is in additional_guest_ids
      if (currentReservation && currentReservation.additional_guest_ids?.includes(selectedGuestId)) {
        const updatedAdditionalGuests = currentReservation.additional_guest_ids.filter(id => id !== selectedGuestId)
        await updateReservation(currentReservation.id, {
          additional_guest_ids: updatedAdditionalGuests
        })
      }

      // Add to new reservation's additional_guest_ids if not already there
      if (newRoomId && newReservation) {
        const currentAdditionalGuests = newReservation.additional_guest_ids || []
        if (!currentAdditionalGuests.includes(selectedGuestId) && newReservation.guest_id !== selectedGuestId) {
          await updateReservation(newReservation.id, {
            additional_guest_ids: [...currentAdditionalGuests, selectedGuestId]
          })
        }
      }

      setSelectedRoomForGuest(newRoomId)
    } catch (error) {
      console.error('Error updating room assignment:', error)
      alert('Failed to update room assignment: ' + error.message)
    }
  }

  const handleEditClick = () => {
    if (selectedGuest) {
      const { firstName, surname } = parseGuestName(selectedGuest.name)
      setEditedGuestDetails({
        firstName,
        surname,
        email: selectedGuest.email || '',
        phone: selectedGuest.phone || '',
        dateOfBirth: selectedGuest.date_of_birth || '',
        idType: selectedGuest.id_proof_type || 'N/A',
        idNumber: selectedGuest.id_proof_number || '',
        address: selectedGuest.address || '',
        city: selectedGuest.city || '',
        state: selectedGuest.state || '',
        country: selectedGuest.country || '',
        photo: null,
        photoUrl: selectedGuest.photo_url || null
      })
      setIsEditMode(true)
    }
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setIsAddingNewGuest(false)
    setEditedGuestDetails(null)
  }

  const handleSaveEdit = async () => {
    if (!selectedGuest || !editedGuestDetails) return

    try {
      const updatedData = {
        name: `${editedGuestDetails.firstName} ${editedGuestDetails.surname}`.trim(),
        email: editedGuestDetails.email,
        phone: editedGuestDetails.phone,
        date_of_birth: editedGuestDetails.dateOfBirth || null,
        id_proof_type: editedGuestDetails.idType,
        id_proof_number: editedGuestDetails.idNumber,
        address: editedGuestDetails.address,
        city: editedGuestDetails.city,
        state: editedGuestDetails.state,
        country: editedGuestDetails.country
      }

      await updateGuest(selectedGuest.id, updatedData)
      setIsEditMode(false)
      setEditedGuestDetails(null)
    } catch (error) {
      console.error('Error updating guest:', error)
      alert('Failed to update guest: ' + error.message)
    }
  }

  const handleSaveNewGuest = async () => {
    if (!editedGuestDetails) return

    // Validate required fields
    if (!editedGuestDetails.firstName.trim()) {
      alert('Please enter a first name')
      return
    }

    try {
      const newGuestData = {
        name: `${editedGuestDetails.firstName} ${editedGuestDetails.surname}`.trim(),
        email: editedGuestDetails.email || '',
        phone: editedGuestDetails.phone || '',
        date_of_birth: editedGuestDetails.dateOfBirth || null,
        id_proof_type: editedGuestDetails.idType !== 'N/A' ? editedGuestDetails.idType : '',
        id_proof_number: editedGuestDetails.idNumber || '',
        address: editedGuestDetails.address || '',
        city: editedGuestDetails.city || '',
        state: editedGuestDetails.state || '',
        country: editedGuestDetails.country || ''
      }

      const newGuest = await addGuest(newGuestData)

      if (newGuest) {
        // Determine which reservation to update
        // Priority: 1) selectedRoomForGuest (user's current choice) 2) placeholderReservationId (original) 3) first reservation
        let targetReservation = null
        const isFillingPlaceholder = !!editedGuestDetails.placeholderReservationId

        if (selectedRoomForGuest) {
          // Use the currently selected room
          targetReservation = groupedReservations.find(r => r.room_id === selectedRoomForGuest)
        } else if (editedGuestDetails.placeholderReservationId) {
          // Fall back to original placeholder reservation
          targetReservation = groupedReservations.find(r => r.id === editedGuestDetails.placeholderReservationId)
        } else {
          // Fall back to first reservation
          targetReservation = groupedReservations[0]
        }

        if (targetReservation) {
          const currentAdditionalGuests = targetReservation.additional_guest_ids || []

          const updateData = {
            additional_guest_ids: [...currentAdditionalGuests, newGuest.id]
          }

          // Check if room was changed from the original placeholder assignment
          const originalReservation = editedGuestDetails.placeholderReservationId
            ? groupedReservations.find(r => r.id === editedGuestDetails.placeholderReservationId)
            : null
          const roomWasChanged = isFillingPlaceholder && originalReservation && targetReservation.id !== originalReservation.id

          // Only increment guest counts if:
          // - NOT filling a placeholder, OR
          // - Filling a placeholder but room was changed to a different reservation
          if (!isFillingPlaceholder || roomWasChanged) {
            if (editedGuestDetails.guestType === 'Adult') {
              updateData.number_of_adults = (targetReservation.number_of_adults || 0) + 1
            } else if (editedGuestDetails.guestType === 'Child') {
              updateData.number_of_children = (targetReservation.number_of_children || 0) + 1
            } else if (editedGuestDetails.guestType === 'Infant') {
              updateData.number_of_infants = (targetReservation.number_of_infants || 0) + 1
            }
          }

          await updateReservation(targetReservation.id, updateData)

          // If room was changed, we need to decrement the original reservation's count
          // (but only if it's not the primary guest of that reservation)
          if (roomWasChanged && originalReservation) {
            const originalUpdateData = {}
            if (editedGuestDetails.guestType === 'Adult') {
              originalUpdateData.number_of_adults = Math.max(0, (originalReservation.number_of_adults || 0) - 1)
            } else if (editedGuestDetails.guestType === 'Child') {
              originalUpdateData.number_of_children = Math.max(0, (originalReservation.number_of_children || 0) - 1)
            } else if (editedGuestDetails.guestType === 'Infant') {
              originalUpdateData.number_of_infants = Math.max(0, (originalReservation.number_of_infants || 0) - 1)
            }
            if (Object.keys(originalUpdateData).length > 0) {
              await updateReservation(originalReservation.id, originalUpdateData)
            }
          }
        }

        // Select the newly created guest
        setSelectedGuestId(newGuest.id)
        setIsAddingNewGuest(false)
        setEditedGuestDetails(null)
      }
    } catch (error) {
      console.error('Error adding guest:', error)
      alert('Failed to add guest: ' + error.message)
    }
  }

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
      setEditedGuestDetails({
        ...editedGuestDetails,
        photo: file,
        photoUrl
      })
    }
  }

  const handleRemovePhoto = () => {
    if (editedGuestDetails.photoUrl) {
      URL.revokeObjectURL(editedGuestDetails.photoUrl)
    }
    setEditedGuestDetails({
      ...editedGuestDetails,
      photo: null,
      photoUrl: null
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const displayGuest = (isEditMode || isAddingNewGuest) ? editedGuestDetails : (selectedGuest ? {
    firstName: parseGuestName(selectedGuest.name).firstName,
    surname: parseGuestName(selectedGuest.name).surname,
    email: selectedGuest.email || '',
    phone: selectedGuest.phone || '',
    dateOfBirth: selectedGuest.date_of_birth || '',
    idType: selectedGuest.id_proof_type || 'N/A',
    idNumber: selectedGuest.id_proof_number || '',
    address: selectedGuest.address || '',
    city: selectedGuest.city || '',
    state: selectedGuest.state || '',
    country: selectedGuest.country || '',
    photoUrl: selectedGuest.photo_url || null
  } : null)

  return (
    <div className="flex gap-6">
      {/* Left Sidebar - Guest List */}
      <div className="w-80 flex-shrink-0">
        <Card>
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold">Guests in Booking</h3>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title="Add Guest"
              onClick={handleAddGuestClick}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          <div>
            {allGuests.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No guests found
              </div>
            ) : (
              <div className="divide-y">
                {allGuests.map((guest) => (
                  <button
                    key={guest.id}
                    onClick={() => handleSelectGuest(guest)}
                    className={`w-full text-left p-3 transition-colors ${
                      guest.isPlaceholder
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 border-l-2 border-amber-300 dark:border-amber-700'
                        : 'hover:bg-muted/30'
                    } ${
                      selectedGuestId === guest.id && !guest.isPlaceholder
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 dark:border-blue-400'
                        : ''
                    } ${
                      selectedGuestId === guest.id && guest.isPlaceholder
                        ? 'bg-amber-100 dark:bg-amber-950/50 border-l-4 border-amber-500 dark:border-amber-400'
                        : ''
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className={`font-medium text-sm truncate ${
                        guest.isPlaceholder ? 'text-amber-700 dark:text-amber-400 italic' : ''
                      }`}>
                        {guest.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {guest.isPrimary && (
                          <Badge variant="info" className="text-xs">Primary</Badge>
                        )}
                        {guest.isPlaceholder && (
                          <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700">
                            Click to add details
                          </Badge>
                        )}
                        {!guest.isPlaceholder && guest.assignedRoomNumber && guest.assignedRoomNumber !== 'N/A' ? (
                          <Badge variant="outline" className="text-xs">
                            <Home className="w-3 h-3 mr-1" />
                            Room {guest.assignedRoomNumber}
                          </Badge>
                        ) : !guest.isPlaceholder && (
                          <span className="text-xs text-muted-foreground italic">No room</span>
                        )}
                        {guest.isPlaceholder && guest.assignedRoomNumber && (
                          <Badge variant="outline" className="text-xs">
                            <Home className="w-3 h-3 mr-1" />
                            Room {guest.assignedRoomNumber}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Right Content - Guest Details Form */}
      <div className="flex-1">
        {!selectedGuest && !selectedPlaceholder && !isAddingNewGuest ? (
          <Card>
            <CardContent className="flex items-center justify-center min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Select a guest to view details</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            {/* Header with Edit/Save buttons */}
            <div className="flex items-center justify-between border-b bg-muted/10 px-4 py-3">
              <div>
                <h3 className="text-lg font-semibold">
                  {isAddingNewGuest
                    ? selectedPlaceholder
                      ? 'Add Guest Details'
                      : 'Add New Guest'
                    : 'Guest Details'}
                </h3>
                {selectedGuest && (
                  <p className="text-xs text-muted-foreground">
                    {selectedGuest.name}
                  </p>
                )}
                {selectedPlaceholder && isAddingNewGuest && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Fill in details for Room {selectedPlaceholder.assignedRoomNumber}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isAddingNewGuest ? (
                  <>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveNewGuest}
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </>
                ) : !isEditMode ? (
                  <Button
                    onClick={handleEditClick}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>

            <CardContent className="p-0">
              {/* Photo Section */}
              <div className="border-b bg-muted/30 px-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {displayGuest?.photoUrl ? (
                      <img
                        src={displayGuest.photoUrl}
                        alt="Guest"
                        className="w-20 h-20 object-cover rounded-md border-2 border-border"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded-md border-2 border-dashed border-border flex items-center justify-center">
                        <User className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {(isEditMode || isAddingNewGuest) && (
                    <div className="flex-1">
                      <Label className="text-sm font-semibold mb-2 block">Guest Photo</Label>
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
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          {displayGuest?.photoUrl ? 'Change' : 'Upload'}
                        </Button>
                        {displayGuest?.photoUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemovePhoto}
                          >
                            Remove
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground">Max 5MB</span>
                      </div>
                    </div>
                  )}

                  {/* Room Assignment Section */}
                  {(selectedGuest || isAddingNewGuest) && groupedReservations.length > 1 && (
                    <div className="flex-shrink-0 border-l pl-4">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        <Home className="w-3 h-3 inline mr-1" />
                        Room Assignment
                      </Label>
                      {(isEditMode || isAddingNewGuest) ? (
                        <Select
                          value={selectedRoomForGuest || 'unassigned'}
                          onValueChange={(value) => {
                            if (isAddingNewGuest) {
                              setSelectedRoomForGuest(value === 'unassigned' ? '' : value)
                            } else {
                              handleRoomAssignmentChange(value === 'unassigned' ? '' : value)
                            }
                          }}
                        >
                          <SelectTrigger className="h-9 w-[200px]">
                            <SelectValue placeholder="Select room" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">No room assigned</SelectItem>
                            {groupedReservations.map((reservation) => {
                              const roomInfo = getRoomInfo(reservation.room_id, reservation.room_type_id)
                              return (
                                <SelectItem key={reservation.room_id || reservation.id} value={reservation.room_id || reservation.id}>
                                  {roomInfo.type} - Room {roomInfo.number}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm flex items-center gap-2">
                          {selectedRoomForGuest ? (
                            <>
                              {(() => {
                                const reservation = groupedReservations.find(r => r.room_id === selectedRoomForGuest)
                                const roomInfo = getRoomInfo(selectedRoomForGuest)
                                return (
                                  <span>
                                    {roomInfo.type} - Room {roomInfo.number}
                                    {reservation && reservation.guest_id === selectedGuestId && (
                                      <Badge variant="info" className="text-xs ml-2">
                                        Primary
                                      </Badge>
                                    )}
                                  </span>
                                )
                              })()}
                            </>
                          ) : (
                            <span className="text-muted-foreground">No room assigned</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="p-4">
                {/* Personal Information Section */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Personal Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="firstName" className="text-xs">First Name *</Label>
                      {(isEditMode || isAddingNewGuest) ? (
                        <Input
                          id="firstName"
                          value={displayGuest.firstName}
                          onChange={(e) => setEditedGuestDetails({ ...editedGuestDetails, firstName: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                          {displayGuest.firstName || '-'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="surname" className="text-xs">Surname *</Label>
                      {(isEditMode || isAddingNewGuest) ? (
                        <Input
                          id="surname"
                          value={displayGuest.surname}
                          onChange={(e) => setEditedGuestDetails({ ...editedGuestDetails, surname: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                          {displayGuest.surname || '-'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-xs">Phone</Label>
                      {(isEditMode || isAddingNewGuest) ? (
                        <Input
                          id="phone"
                          type="tel"
                          value={displayGuest.phone}
                          onChange={(e) => setEditedGuestDetails({ ...editedGuestDetails, phone: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                          {displayGuest.phone || '-'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-xs">Email</Label>
                      {(isEditMode || isAddingNewGuest) ? (
                        <Input
                          id="email"
                          type="email"
                          value={displayGuest.email}
                          onChange={(e) => setEditedGuestDetails({ ...editedGuestDetails, email: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                          {displayGuest.email || '-'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="dateOfBirth" className="text-xs">Date of Birth</Label>
                      {(isEditMode || isAddingNewGuest) ? (
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={displayGuest.dateOfBirth}
                          onChange={(e) => setEditedGuestDetails({ ...editedGuestDetails, dateOfBirth: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                          {displayGuest.dateOfBirth || '-'}
                        </div>
                      )}
                    </div>

                    {isAddingNewGuest && !editedGuestDetails?.placeholderReservationId && (
                      <div className="space-y-1">
                        <Label htmlFor="guestType" className="text-xs">Guest Type *</Label>
                        <Select
                          value={editedGuestDetails.guestType}
                          onValueChange={(value) => setEditedGuestDetails({ ...editedGuestDetails, guestType: value })}
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
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">ID Proof</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="idType" className="text-xs">ID Type</Label>
                      {(isEditMode || isAddingNewGuest) ? (
                        <Select
                          value={displayGuest.idType}
                          onValueChange={(value) => setEditedGuestDetails({ ...editedGuestDetails, idType: value })}
                        >
                          <SelectTrigger id="idType" className="h-9">
                            <SelectValue />
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
                          {displayGuest.idType || '-'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 md:col-span-1 lg:col-span-2">
                      <Label htmlFor="idNumber" className="text-xs">ID Number</Label>
                      {(isEditMode || isAddingNewGuest) ? (
                        <Input
                          id="idNumber"
                          value={displayGuest.idNumber}
                          onChange={(e) => setEditedGuestDetails({ ...editedGuestDetails, idNumber: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                          {displayGuest.idNumber || '-'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="pt-4 border-t">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1 md:col-span-2 lg:col-span-3">
                      <Label htmlFor="address" className="text-xs">Street Address</Label>
                      {(isEditMode || isAddingNewGuest) ? (
                        <Input
                          id="address"
                          value={displayGuest.address}
                          onChange={(e) => setEditedGuestDetails({ ...editedGuestDetails, address: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                          {displayGuest.address || '-'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="city" className="text-xs">City</Label>
                      {(isEditMode || isAddingNewGuest) ? (
                        <Input
                          id="city"
                          value={displayGuest.city}
                          onChange={(e) => setEditedGuestDetails({ ...editedGuestDetails, city: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                          {displayGuest.city || '-'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="state" className="text-xs">State</Label>
                      {(isEditMode || isAddingNewGuest) ? (
                        <Input
                          id="state"
                          value={displayGuest.state}
                          onChange={(e) => setEditedGuestDetails({ ...editedGuestDetails, state: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                          {displayGuest.state || '-'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="country" className="text-xs">Country</Label>
                      {(isEditMode || isAddingNewGuest) ? (
                        <Input
                          id="country"
                          value={displayGuest.country}
                          onChange={(e) => setEditedGuestDetails({ ...editedGuestDetails, country: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <div className="h-9 px-3 py-2 border rounded-md bg-muted/30 text-sm">
                          {displayGuest.country || '-'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

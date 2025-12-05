import { useState } from 'react'
import { User, UserPlus, Edit, Save, X, Home, Star, Trash2 } from 'lucide-react'
import { useGuests } from '../../context/GuestContext'
import { useReservations } from '../../context/ReservationContext'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { ScrollArea } from '../ui/scroll-area'
import GuestFormFields from '../guests/GuestFormFields'

// Helper function to get initials from name
const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function GuestDetailsTab({ groupedReservations, guests, getRoomInfo }) {
  const { idProofTypes, genderOptions, nationalities, updateGuest, addGuest } = useGuests()
  const { updateReservation } = useReservations()
  const [selectedGuestId, setSelectedGuestId] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isAddingNewGuest, setIsAddingNewGuest] = useState(false)
  const [editedGuestDetails, setEditedGuestDetails] = useState(null)
  const [selectedRoomForGuest, setSelectedRoomForGuest] = useState('')

  // Get all guests for this booking
  const getAllGuests = () => {
    const existingGuests = []

    groupedReservations.forEach((reservation) => {
      const roomInfo = getRoomInfo(reservation.room_id, reservation.room_type_id)

      // Add primary guest
      if (reservation.guest_id) {
        const guest = guests.find(g => g.id === reservation.guest_id)
        if (guest) {
          const guestEntry = {
            ...guest,
            isPrimary: true,
            assignedRoomNumber: roomInfo.number,
            assignedRoomType: roomInfo.type,
            // Use same ID format as roomOptions (room_id || id)
            assignedRoomId: reservation.room_id || reservation.id,
            reservationId: reservation.id
          }

          // Only add if not already in existingGuests
          if (!existingGuests.find(g => g.id === guest.id)) {
            existingGuests.push(guestEntry)
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
              assignedRoomNumber: roomInfo.number,
              assignedRoomType: roomInfo.type,
              // Use same ID format as roomOptions (room_id || id)
              assignedRoomId: reservation.room_id || reservation.id,
              reservationId: reservation.id
            }
            existingGuests.push(guestEntry)
          }
        })
      }
    })

    return existingGuests
  }

  const allGuests = getAllGuests()
  const selectedGuest = selectedGuestId ? guests.find(g => g.id === selectedGuestId) : null

  // Parse guest name into firstName and surname
  const parseGuestName = (name) => {
    const nameParts = (name || '').trim().split(' ')
    return {
      firstName: nameParts[0] || '',
      surname: nameParts.slice(1).join(' ') || ''
    }
  }

  const handleSelectGuest = (guest) => {
    setSelectedGuestId(guest.id)
    setIsEditMode(false)
    setIsAddingNewGuest(false)
    setEditedGuestDetails(null)
    // Set the room assignment for this guest
    setSelectedRoomForGuest(guest.assignedRoomId || '')
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
      photoUrl: null,
      gender: '',
      nationality: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      isVip: false
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

      // Find the new reservation to assign to (check both room_id and reservation id)
      const newReservation = groupedReservations.find(r =>
        r.room_id === newRoomId || r.id === newRoomId
      )

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
        photoUrl: selectedGuest.photo_url || null,
        gender: selectedGuest.gender || '',
        nationality: selectedGuest.nationality || '',
        emergencyContactName: selectedGuest.emergency_contact_name || '',
        emergencyContactPhone: selectedGuest.emergency_contact_phone || '',
        isVip: selectedGuest.is_vip || false
      })
      setIsEditMode(true)
    }
  }

  const handleCancelEdit = () => {
    // If we were adding a new guest (including from placeholder), clear selection
    if (isAddingNewGuest) {
      setSelectedGuestId(null)
    }
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
        country: editedGuestDetails.country,
        gender: editedGuestDetails.gender || null,
        nationality: editedGuestDetails.nationality || null,
        emergency_contact_name: editedGuestDetails.emergencyContactName || null,
        emergency_contact_phone: editedGuestDetails.emergencyContactPhone || null,
        is_vip: editedGuestDetails.isVip || false
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
        country: editedGuestDetails.country || '',
        gender: editedGuestDetails.gender || '',
        nationality: editedGuestDetails.nationality || '',
        emergency_contact_name: editedGuestDetails.emergencyContactName || '',
        emergency_contact_phone: editedGuestDetails.emergencyContactPhone || '',
        is_vip: editedGuestDetails.isVip || false
      }

      const newGuest = await addGuest(newGuestData)

      if (newGuest) {
        // Determine which reservation to update
        // Priority: 1) selectedRoomForGuest (user's current choice) 2) first reservation
        let targetReservation = null

        if (selectedRoomForGuest) {
          // Check both room_id and reservation id (roomOptions uses room_id || id)
          targetReservation = groupedReservations.find(r =>
            r.room_id === selectedRoomForGuest || r.id === selectedRoomForGuest
          )
        } else {
          targetReservation = groupedReservations[0]
        }

        if (targetReservation) {
          const currentAdditionalGuests = targetReservation.additional_guest_ids || []

          await updateReservation(targetReservation.id, {
            additional_guest_ids: [...currentAdditionalGuests, newGuest.id]
          })

          // Update selectedRoomForGuest to match where guest was actually assigned
          setSelectedRoomForGuest(targetReservation.room_id || targetReservation.id)
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

  // Handle removing an additional guest from the booking
  const handleRemoveGuest = async (guestId, reservationId) => {
    if (!confirm('Are you sure you want to remove this guest from the booking?')) return

    try {
      const reservation = groupedReservations.find(r => r.id === reservationId)
      if (!reservation) return

      // Remove guest from additional_guest_ids
      const updatedAdditionalGuests = (reservation.additional_guest_ids || []).filter(id => id !== guestId)

      // Decrement guest count (assume adult if we can't determine type)
      const guest = guests.find(g => g.id === guestId)
      const updateData = {
        additional_guest_ids: updatedAdditionalGuests,
        number_of_adults: Math.max(0, (reservation.number_of_adults || 0) - 1)
      }

      await updateReservation(reservationId, updateData)

      // Clear selection if this guest was selected
      if (selectedGuestId === guestId) {
        setSelectedGuestId(null)
        setEditedGuestDetails(null)
      }
    } catch (error) {
      console.error('Error removing guest:', error)
      alert('Failed to remove guest: ' + error.message)
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
    photoUrl: selectedGuest.photo_url || null,
    gender: selectedGuest.gender || '',
    nationality: selectedGuest.nationality || '',
    emergencyContactName: selectedGuest.emergency_contact_name || '',
    emergencyContactPhone: selectedGuest.emergency_contact_phone || '',
    isVip: selectedGuest.is_vip || false
  } : null)

  return (
    <div className="flex gap-6">
      {/* Left Sidebar - Guest List */}
      <div className="w-80 flex-shrink-0">
        <Card>
          <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Guests in Booking</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Add Guest"
              onClick={handleAddGuestClick}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {allGuests.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No guests found
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="divide-y divide-border">
                  {allGuests.map((guest) => (
                    <Button
                      key={guest.id}
                      variant="ghost"
                      className={`w-full h-auto justify-start rounded-none px-4 py-3 ${
                        selectedGuestId === guest.id
                          ? 'bg-accent border-l-4 border-l-primary'
                          : 'border-l-4 border-l-transparent'
                      }`}
                      onClick={() => handleSelectGuest(guest)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {/* Avatar - photo or initials fallback */}
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          {guest.photo_url && (
                            <AvatarImage src={guest.photo_url} alt={guest.name} />
                          )}
                          <AvatarFallback>
                            {getInitials(guest.name)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Name and badges beside avatar */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm truncate">
                              {guest.name}
                            </span>
                            {guest.is_vip && (
                              <Star className="w-3.5 h-3.5 text-warning fill-warning flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {guest.isPrimary && (
                              <Badge variant="info" className="text-xs">Primary</Badge>
                            )}
                            {guest.assignedRoomNumber && guest.assignedRoomNumber !== 'N/A' ? (
                              <Badge variant="outline" className="text-xs">
                                <Home className="w-3 h-3 mr-1" />
                                Room {guest.assignedRoomNumber}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No room</span>
                            )}
                          </div>
                        </div>
                        {/* Remove button for additional guests (not primary) */}
                        {!guest.isPrimary && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveGuest(guest.id, guest.reservationId)
                            }}
                            title="Remove guest from booking"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Content - Guest Details Form */}
      <div className="flex-1">
        {!selectedGuest && !isAddingNewGuest ? (
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-muted/10">
              <div>
                <CardTitle className="text-lg">
                  {isAddingNewGuest ? 'Add New Guest' : 'Guest Details'}
                </CardTitle>
                {selectedGuest && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedGuest.name}
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
            </CardHeader>

            <CardContent className="p-0">
              <GuestFormFields
                guestDetails={displayGuest}
                onChange={setEditedGuestDetails}
                isEditing={isEditMode || isAddingNewGuest}
                showPhoto={true}
                roomOptions={groupedReservations.length > 1 ? groupedReservations.map((reservation) => {
                  const roomInfo = getRoomInfo(reservation.room_id, reservation.room_type_id)
                  return {
                    id: reservation.room_id || reservation.id,
                    label: `${roomInfo.type} - Room ${roomInfo.number}`
                  }
                }) : []}
                selectedRoom={selectedRoomForGuest}
                onRoomChange={(roomId) => {
                  if (isAddingNewGuest) {
                    setSelectedRoomForGuest(roomId)
                  } else {
                    handleRoomAssignmentChange(roomId)
                  }
                }}
                dropdownOptions={{ idProofTypes, genderOptions, nationalities }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

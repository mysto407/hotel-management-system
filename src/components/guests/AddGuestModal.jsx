// src/components/guests/AddGuestModal.jsx
import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { useGuests } from '../../context/GuestContext'
import { useAlert } from '@/context/AlertContext'
import GuestFormFields from './GuestFormFields'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

const getInitialFormData = () => ({
  firstName: '',
  surname: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  idType: 'AADHAR',
  idNumber: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  gender: '',
  nationality: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  isVip: false,
  photoUrl: null,
  photo: null,
})

export const AddGuestModal = ({ isOpen, onClose, onGuestAdded }) => {
  const { addGuest, idProofTypes, genderOptions, nationalities } = useGuests()
  const { error: showError, warning: showWarning } = useAlert()
  const [guestDetails, setGuestDetails] = useState(getInitialFormData())

  const resetForm = () => {
    setGuestDetails(getInitialFormData())
    onClose()
  }

  const handleCreateGuest = async () => {
    // Combine firstName and surname into name for database
    const fullName = `${guestDetails.firstName} ${guestDetails.surname}`.trim()

    if (!fullName) {
      showWarning('Please enter guest name')
      return
    }

    try {
      // Transform camelCase form data to snake_case for database
      const guestData = {
        name: fullName,
        email: guestDetails.email || '',
        phone: guestDetails.phone || '',
        date_of_birth: guestDetails.dateOfBirth || null,
        id_proof_type: guestDetails.idType !== 'N/A' ? guestDetails.idType : '',
        id_proof_number: guestDetails.idNumber || '',
        address: guestDetails.address || '',
        city: guestDetails.city || '',
        state: guestDetails.state || '',
        country: guestDetails.country || '',
        gender: guestDetails.gender || '',
        nationality: guestDetails.nationality || '',
        emergency_contact_name: guestDetails.emergencyContactName || '',
        emergency_contact_phone: guestDetails.emergencyContactPhone || '',
        is_vip: guestDetails.isVip || false,
      }

      const newGuest = await addGuest(guestData)
      if (newGuest) {
        if (onGuestAdded) {
          onGuestAdded(newGuest)
        }
        resetForm()
      }
    } catch (error) {
      console.error('Error adding guest:', error)
      showError('Failed to add guest: ' + error.message)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Guest</DialogTitle>
        </DialogHeader>

        <GuestFormFields
          guestDetails={guestDetails}
          onChange={setGuestDetails}
          isEditing={true}
          showPhoto={false}
          dropdownOptions={{ idProofTypes, genderOptions, nationalities }}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={resetForm}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleCreateGuest}>
            <Save className="mr-2 h-4 w-4" /> Add Guest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

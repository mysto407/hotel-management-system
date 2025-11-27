// src/context/ReservationContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getReservations,
  getReservationById,
  createReservation as createReservationAPI,
  updateReservation as updateReservationAPI,
  deleteReservation as deleteReservationAPI,
  splitReservation as splitReservationAPI,
  updateRoomStatus,
  createBill,
  getMealPlanByCode,
  // Folio and transaction business logic
  createMasterFolio,
  getFoliosByReservation,
  getTransactionsByReservation,
  generateDailyRoomCharges,
  generateDailyRoomChargesWithTax,
  createServiceCharge,
  createServiceChargeWithTax,
  calculateAndApplyTaxes,
  generateExtraPersonCharges,
  generateAllAddonCharges,
  // Room assignment functions
  assignRoomToReservation as assignRoomAPI,
  autoAssignRooms as autoAssignRoomsAPI
} from '../lib/supabase';
import { useAlert } from './AlertContext';
import { useAuth } from './AuthContext';

const ReservationContext = createContext();

export const useReservations = () => {
  const context = useContext(ReservationContext);
  if (!context) throw new Error('useReservations must be used within ReservationProvider');
  return context;
};

export const ReservationProvider = ({ children }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { error: showError, success: showSuccess } = useAlert();
  const { user } = useAuth();

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    setLoading(true);
    const { data, error } = await getReservations();
    if (error) {
      console.error('Error loading reservations:', error);
    } else {
      setReservations(data || []);
    }
    setLoading(false);
  };

  const addReservation = async (reservation) => {
    const { data, error } = await createReservationAPI(reservation);
    if (error) {
      console.error('Error creating reservation:', error);
      showError('Failed to create reservation: ' + error.message);
      return null;
    }

    const createdReservation = data[0];
    let masterFolio = null;

    // Create master folio immediately after reservation is created
    try {
      const { data: newFolio, error: folioError } = await createMasterFolio(createdReservation.id, {
        guestName: 'Main Folio'
      });

      if (folioError) {
        console.error('Error creating folio:', folioError);
        showError('Reservation created but failed to create folio. Please contact support.');
      } else {
        masterFolio = newFolio;
      }
    } catch (folioError) {
      console.error('Error creating folio:', folioError);
      // Continue even if folio creation fails - user can create it manually later
    }

    // Generate folio charges if folio was created successfully
    if (masterFolio) {
      try {
        // Fetch the full reservation with all relations to get rate info
        const { data: fullReservation, error: fetchError } = await getReservationById(createdReservation.id);

        if (!fetchError && fullReservation) {
          // Calculate number of nights
          const checkIn = new Date(fullReservation.check_in_date);
          const checkOut = new Date(fullReservation.check_out_date);
          const nights = Math.ceil(Math.abs(checkOut - checkIn) / (1000 * 60 * 60 * 24));

          // Get room rate from rate type or room type
          const roomRate = fullReservation.room_rate_types?.base_price
            || fullReservation.room_types?.base_price
            || fullReservation.rooms?.room_types?.base_price
            || 0;

          // Get room number (use room if assigned, otherwise use room type name)
          const roomNumber = fullReservation.rooms?.room_number
            || fullReservation.room_types?.name
            || 'TBA';

          if (roomRate > 0) {
            // Generate daily room charges with taxes
            const { data: chargeData, error: roomChargeError } = await generateDailyRoomChargesWithTax(
              createdReservation.id,
              masterFolio.id,
              roomRate,
              fullReservation.check_in_date,
              fullReservation.check_out_date,
              roomNumber,
              user?.id || null,
              true // applyTaxes
            );

            if (roomChargeError) {
              console.error('Error generating room charges:', roomChargeError);
            } else if (chargeData) {
              console.log(`Folio created with room charges: ₹${chargeData.totalRoomCharges}, Taxes: ₹${chargeData.totalTaxCharges}`);
            }

            // Generate meal plan charges if applicable
            if (fullReservation.meal_plan && fullReservation.meal_plan !== 'EP' && fullReservation.meal_plan !== 'NM') {
              try {
                const { data: mealPlanData } = await getMealPlanByCode(fullReservation.meal_plan);
                if (mealPlanData && mealPlanData.length > 0) {
                  const mealPlanPrice = parseFloat(mealPlanData[0].price_per_person) || 0;
                  if (mealPlanPrice > 0) {
                    const totalGuests = (fullReservation.number_of_adults || 1) + (fullReservation.number_of_children || 0);
                    const mealPlanPerNight = mealPlanPrice * totalGuests;

                    // Create scheduled meal plan charges for each day
                    const checkInDate = new Date(fullReservation.check_in_date);
                    for (let i = 0; i < nights; i++) {
                      const scheduledDate = new Date(checkInDate);
                      scheduledDate.setDate(scheduledDate.getDate() + i);
                      scheduledDate.setHours(0, 0, 0, 0);

                      const mealPlanDescription = `Meal Plan (${mealPlanData[0].name}) - Day ${i + 1} - ${totalGuests} guests`;

                      await createServiceChargeWithTax(
                        masterFolio.id,
                        createdReservation.id,
                        mealPlanPerNight,
                        mealPlanDescription,
                        'meal_plan',
                        user?.id || null,
                        scheduledDate
                      );
                    }
                  }
                }
              } catch (mealPlanError) {
                console.error('Error creating meal plan charges:', mealPlanError);
              }
            }

            // Generate extra person fees if applicable
            const baseOccupancy = fullReservation.room_rate_types?.base_occupancy || 2;
            const extraAdultFee = fullReservation.room_rate_types?.extra_adult_fee || 0;
            const extraChildFee = fullReservation.room_rate_types?.extra_child_fee || 0;
            const extraFeeUnit = fullReservation.room_rate_types?.extra_fee_unit || 'per_night';

            const totalAdults = fullReservation.number_of_adults || 1;
            const totalChildren = fullReservation.number_of_children || 0;
            const extraAdults = Math.max(0, totalAdults - baseOccupancy);
            const extraChildren = totalChildren;

            if ((extraAdults > 0 && extraAdultFee > 0) || (extraChildren > 0 && extraChildFee > 0)) {
              try {
                await generateExtraPersonCharges(
                  createdReservation.id,
                  masterFolio.id,
                  extraAdults,
                  extraChildren,
                  extraAdultFee,
                  extraChildFee,
                  nights,
                  extraFeeUnit,
                  user?.id || null,
                  true // applyTaxes
                );
              } catch (extraPersonError) {
                console.error('Error creating extra person charges:', extraPersonError);
              }
            }

            // Generate rate plan add-on charges if applicable
            if (fullReservation.rate_type_id) {
              try {
                const totalGuests = (fullReservation.number_of_adults || 1) + (fullReservation.number_of_children || 0);
                await generateAllAddonCharges(
                  fullReservation.rate_type_id,
                  masterFolio.id,
                  createdReservation.id,
                  nights,
                  totalGuests,
                  user?.id || null,
                  true // applyTaxes
                );
              } catch (addonError) {
                console.error('Error creating add-on charges:', addonError);
              }
            }
          }
        }
      } catch (chargeError) {
        console.error('Error generating folio charges:', chargeError);
        // Continue even if charge generation fails - user can add charges manually
      }
    }

    // Update room status for display purposes only (only if room is assigned)
    // Note: Actual availability is determined by date-based queries, not status
    if (reservation.room_id) {
      if (reservation.status === 'Checked-in') {
        await updateRoomStatus(reservation.room_id, 'Occupied');
      } else if (reservation.status === 'Confirmed') {
        // Set room to Reserved when a confirmed booking is created
        await updateRoomStatus(reservation.room_id, 'Reserved');
      }
    }

    await loadReservations(); // Reload to get with relations
    return createdReservation;
  };

  const updateReservation = async (id, updatedReservation) => {
    const { error } = await updateReservationAPI(id, updatedReservation);
    if (error) {
      console.error('Error updating reservation:', error);
      showError('Failed to update reservation: ' + error.message);
      return;
    }
    await loadReservations();
  };

  const deleteReservation = async (id) => {
    const { error } = await deleteReservationAPI(id);
    if (error) {
      console.error('Error deleting reservation:', error);
      showError('Cannot delete reservation: ' + error.message);
      return;
    }
    setReservations(reservations.filter(r => r.id !== id));
  };

  // Calculate number of nights between check-in and check-out
  const calculateNights = (checkInDate, checkOutDate) => {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const diffTime = Math.abs(checkOut - checkIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const checkIn = async (id) => {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return { success: false, error: 'Reservation not found' };

    // CRITICAL: Check if room is assigned before check-in
    if (!reservation.room_id) {
      return {
        success: false,
        needsRoomAssignment: true,
        error: 'No room assigned. Please assign a room before check-in.'
      };
    }

    try {
      // Update reservation status to Checked-in
      await updateReservation(id, { status: 'Checked-in' });

      // Update room status to Occupied (for display purposes only)
      // Note: Actual availability is determined by date-based queries
      await updateRoomStatus(reservation.room_id, 'Occupied');

      // Get or create master folio for the reservation
      const { data: existingFolios } = await getFoliosByReservation(id);
      let masterFolio = existingFolios?.find(f => f.folio_type === 'master');

      if (!masterFolio) {
        const { data: newFolio } = await createMasterFolio(id, {
          guestName: reservation.guests?.name || 'Main'
        });
        masterFolio = newFolio;
      }

      if (!masterFolio) {
        console.error('Failed to create or find master folio');
        showError('Failed to create billing folio');
        return;
      }

      // Check if charges already exist (generated at reservation creation)
      const { data: existingTransactions } = await getTransactionsByReservation(id);
      const hasExistingRoomCharges = existingTransactions?.some(
        tx => tx.transaction_type === 'room_charge' && tx.transaction_status !== 'voided' && tx.transaction_status !== 'reversed'
      );

      const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);
      const rateTypeName = reservation.room_rate_types?.rate_name || 'Standard Rate';
      let chargeData = null;
      let extraPersonData = null;
      let addonData = null;

      // Only generate charges if they don't already exist
      if (!hasExistingRoomCharges) {
        const roomRate = reservation.room_rate_types?.base_price || reservation.rooms?.room_types?.base_price || 0;

        // Generate daily room charges with auto-posting at midnight AND automatic tax calculation
        const { data: newChargeData, error: roomChargeError } = await generateDailyRoomChargesWithTax(
          id, // reservation_id
          masterFolio.id, // folio_id
          roomRate, // room_rate
          reservation.check_in_date, // check_in_date
          reservation.check_out_date, // check_out_date
          reservation.rooms?.room_number || 'N/A', // room_number
          user?.id || null, // user_id
          true // applyTaxes - automatically apply configured taxes (GST)
        );

        if (roomChargeError) {
          console.error('Error generating room charges:', roomChargeError);
          showError('Guest checked in successfully, but failed to generate room charges. Please add manually.');
          return { success: true };
        }

        chargeData = newChargeData;

        // Log tax information
        if (chargeData) {
          console.log(`Room charges: ₹${chargeData.totalRoomCharges}, Taxes: ₹${chargeData.totalTaxCharges}`);
        }

        // Add meal plan charges if available (scheduled for each day) WITH automatic tax
        if (reservation.meal_plan && reservation.meal_plan !== 'EP' && reservation.meal_plan !== 'NM') {
          try {
            const { data: mealPlanData } = await getMealPlanByCode(reservation.meal_plan);
            if (mealPlanData && mealPlanData.length > 0) {
              const mealPlanPrice = parseFloat(mealPlanData[0].price_per_person) || 0;
              if (mealPlanPrice > 0) {
                const totalGuests = (reservation.number_of_adults || 1) + (reservation.number_of_children || 0);
                const mealPlanPerNight = mealPlanPrice * totalGuests;

                // Create scheduled meal plan charges for each day WITH tax
                const checkInDate = new Date(reservation.check_in_date);
                for (let i = 0; i < nights; i++) {
                  const scheduledDate = new Date(checkInDate);
                  scheduledDate.setDate(scheduledDate.getDate() + i);
                  scheduledDate.setHours(0, 0, 0, 0); // Midnight

                  const mealPlanDescription = `Meal Plan (${mealPlanData[0].name}) - Day ${i + 1} - ${totalGuests} guests`;

                  // Use the new function that auto-applies taxes
                  await createServiceChargeWithTax(
                    masterFolio.id,
                    id,
                    mealPlanPerNight,
                    mealPlanDescription,
                    'meal_plan',
                    user?.id || null,
                    scheduledDate
                  );
                }
              }
            }
          } catch (mealPlanError) {
            console.error('Error creating meal plan charges:', mealPlanError);
            // Continue without meal plan if there's an error
          }
        }

        // Generate extra person fees if applicable
        const baseOccupancy = reservation.room_rate_types?.base_occupancy || 2;
        const extraAdultFee = reservation.room_rate_types?.extra_adult_fee || 0;
        const extraChildFee = reservation.room_rate_types?.extra_child_fee || 0;
        const extraFeeUnit = reservation.room_rate_types?.extra_fee_unit || 'per_night';

        // Calculate extra guests beyond base occupancy
        const totalAdults = reservation.number_of_adults || 1;
        const totalChildren = reservation.number_of_children || 0;
        const extraAdults = Math.max(0, totalAdults - baseOccupancy);
        // Children are typically counted as extra regardless of base occupancy
        const extraChildren = totalChildren;

        if ((extraAdults > 0 && extraAdultFee > 0) || (extraChildren > 0 && extraChildFee > 0)) {
          try {
            const { data: extraData, error: extraError } = await generateExtraPersonCharges(
              id,
              masterFolio.id,
              extraAdults,
              extraChildren,
              extraAdultFee,
              extraChildFee,
              nights,
              extraFeeUnit,
              user?.id || null,
              true // applyTaxes
            );

            if (extraError) {
              console.error('Error generating extra person fees:', extraError);
            } else {
              extraPersonData = extraData;
              console.log(`Extra person fees: ₹${extraData.totalExtraFees}, Taxes: ₹${extraData.totalTaxes}`);
            }
          } catch (extraPersonError) {
            console.error('Error creating extra person charges:', extraPersonError);
            // Continue even if extra person fees fail
          }
        }

        // Generate rate plan add-on charges if applicable
        if (reservation.rate_type_id) {
          try {
            const totalGuests = (reservation.number_of_adults || 1) + (reservation.number_of_children || 0);
            const { data: addons, error: addonError } = await generateAllAddonCharges(
              reservation.rate_type_id,
              masterFolio.id,
              id,
              nights,
              totalGuests,
              user?.id || null,
              true // applyTaxes
            );

            if (addonError) {
              console.error('Error generating add-on charges:', addonError);
            } else if (addons && addons.addonsProcessed > 0) {
              addonData = addons;
              console.log(`Add-on charges: ₹${addons.totalAddonFees}, Taxes: ₹${addons.totalTaxes} (${addons.addonsProcessed} add-ons)`);
            }
          } catch (addonError) {
            console.error('Error creating add-on charges:', addonError);
            // Continue even if add-on charges fail
          }
        }
      } else {
        console.log('Charges already exist from reservation creation, skipping charge generation');
      }

      // Build success message
      let successMsg = `Guest checked in! ${nights} night(s) @ ${rateTypeName}.`;

      if (!hasExistingRoomCharges) {
        const totalRoomAndTax = chargeData ? (chargeData.totalRoomCharges + chargeData.totalTaxCharges) : 0;
        const totalExtraAndTax = extraPersonData ? (extraPersonData.totalExtraFees + extraPersonData.totalTaxes) : 0;
        const totalAddonAndTax = addonData ? (addonData.totalAddonFees + addonData.totalTaxes) : 0;
        const totalCharges = totalRoomAndTax + totalExtraAndTax + totalAddonAndTax;

        if (extraPersonData && (extraPersonData.extraAdults > 0 || extraPersonData.extraChildren > 0)) {
          successMsg += ` Extra person fees applied.`;
        }
        if (addonData && addonData.addonsProcessed > 0) {
          successMsg += ` ${addonData.addonsProcessed} add-on(s) charged.`;
        }
        successMsg += ` Total: ₹${totalCharges.toLocaleString()}`;
      } else {
        successMsg += ` Folio charges already prepared.`;
      }
      showSuccess(successMsg);

      return { success: true };
    } catch (error) {
      console.error('Error during check-in:', error);
      showError('Failed to complete check-in: ' + error.message);
      return { success: false, error: error.message };
    }
  };

  // Assign a specific room to a reservation
  const assignRoom = async (reservationId, roomId, forceRoomType = false) => {
    const { data, error } = await assignRoomAPI(reservationId, roomId, forceRoomType);

    if (error) {
      // Return specific error for room type mismatch (to show force move dialog)
      if (error.code === 'ROOM_TYPE_MISMATCH') {
        return { data: null, error, needsForceMove: true };
      }
      console.error('Error assigning room:', error);
      showError('Failed to assign room: ' + error.message);
      return { data: null, error };
    }

    showSuccess('Room assigned successfully');
    await loadReservations();
    return { data, error: null };
  };

  // Unassign room from a reservation (make it unassigned again)
  const unassignRoom = async (reservationId) => {
    const { error } = await updateReservationAPI(reservationId, { room_id: null });

    if (error) {
      console.error('Error unassigning room:', error);
      showError('Failed to unassign room: ' + error.message);
      return false;
    }

    showSuccess('Room unassigned');
    await loadReservations();
    return true;
  };

  // Auto-assign rooms to unassigned reservations
  const autoAssignRooms = async (reservationIds = null, roomTypeId = null) => {
    const { data, error } = await autoAssignRoomsAPI(reservationIds, roomTypeId);

    if (error) {
      console.error('Error auto-assigning rooms:', error);
      showError('Failed to auto-assign rooms: ' + error.message);
      return null;
    }

    const { assigned, failed } = data;
    if (assigned.length > 0) {
      showSuccess(`Successfully assigned ${assigned.length} room(s)`);
    }
    if (failed.length > 0) {
      showError(`Failed to assign ${failed.length} reservation(s)`);
    }

    await loadReservations();
    return data;
  };

  const checkOut = async (id) => {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;

    await updateReservation(id, { status: 'Checked-out' });
    // Update room status to Available (for display purposes only, only if room was assigned)
    // Note: Actual availability is determined by date-based queries
    if (reservation.room_id) {
      await updateRoomStatus(reservation.room_id, 'Available');
    }
  };

  const cancelReservation = async (id) => {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;

    await updateReservation(id, { status: 'Cancelled' });

    // Update room status to Available if it was occupied/reserved (for display purposes only)
    // Note: Actual availability is determined by date-based queries
    if (reservation.room_id && (reservation.status === 'Checked-in' || reservation.status === 'Confirmed')) {
      await updateRoomStatus(reservation.room_id, 'Available');
    }
  };

  const splitReservation = async (originalReservationId, splitData) => {
    const { data, error } = await splitReservationAPI(originalReservationId, splitData);

    if (error) {
      console.error('Error splitting reservation:', error);
      showError('Failed to split reservation: ' + error.message);
      return null;
    }

    showSuccess('Reservation split successfully');
    await loadReservations();
    return data;
  };

  return (
    <ReservationContext.Provider value={{
      reservations,
      loading,
      addReservation,
      updateReservation,
      deleteReservation,
      splitReservation,
      checkIn,
      checkOut,
      cancelReservation,
      // Room assignment functions
      assignRoom,
      unassignRoom,
      autoAssignRooms,
      fetchReservations: loadReservations
    }}>
      {children}
    </ReservationContext.Provider>
  );
};
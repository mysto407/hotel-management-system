# Reservation Calendar - Feature Documentation

## Overview
The Reservation Calendar is an interactive visual interface for managing hotel reservations. It displays rooms vertically and dates horizontally, allowing staff to view availability, create bookings, and manage existing reservations.

---

## Calendar Navigation & Display

### Navigation Controls
| Feature | Description |
|---------|-------------|
| **Previous Week** | Navigate 7 days back |
| **Next Week** | Navigate 7 days forward |
| **Go to Today** | Jump to current date |
| **Date Picker** | Jump to any specific date |
| **View Range** | Toggle between 7, 14, or 30 days |
| **Refresh** | Reload reservations and room data |

### Visual Indicators
| Feature | Description |
|---------|-------------|
| **Today Highlight** | Current date column is visually highlighted |
| **Weekend Indicator** | Saturday/Sunday columns styled differently |
| **Availability %** | Shows overall availability percentage per date in header |

---

## Room Type & Room Display

### Room Type Rows
- **Collapsible Sections**: Click room type to expand/collapse individual rooms
- **Room Count**: Shows total rooms of that type
- **Availability Count**: Shows available rooms per date for each room type

### Individual Room Rows
- **Room Number**: Displayed in fixed left column
- **Date Cells**: Interactive cells for each date

---

## Reservation Bars

### Status Color Coding
| Status | Color | Description |
|--------|-------|-------------|
| **Confirmed** | Green (#10b981) | Confirmed reservation |
| **Checked-in** | Blue (#3b82f6) | Guest currently staying |
| **Hold** | Orange (#f59e0b) | Tentative hold on room |

### Bar Features
- **Guest Name**: Displayed on the reservation bar
- **Hover Tooltip**: Shows guest name and check-in/out dates
- **Lock Icon**: Displays on Hold reservations
- **Partial Indicators**: Visual cues when reservation extends beyond visible dates

---

## Cell Selection & Booking

### Single Cell Selection
1. Click on any empty/available cell
2. Action menu appears with booking options

### Drag Selection (Multi-Date/Multi-Room)
1. Click and drag across multiple cells
2. Can select across different rooms and consecutive dates
3. Selection bar shows "Selected" indicator
4. Release to open action menu with multi-booking options

### Selection Rules
- Only available cells can be selected
- Cells with existing reservations cannot be selected
- Blocked/Maintenance rooms cannot be selected

---

## Action Menus

### Empty Cell Action Menu
Appears when clicking on available cell(s):

| Action | Description |
|--------|-------------|
| **Book** | Create a new Confirmed reservation |
| **Hold** | Create a Hold reservation (tentative) |
| **Block** | Block the selected room(s) |

### Reservation Action Menu
Appears when clicking on an existing reservation bar:

| Action | Description |
|--------|-------------|
| **Edit Reservation** | Opens edit modal to modify booking |
| **Cancel Reservation** | Changes status to Cancelled |
| **Delete Permanently** | Removes reservation from database (requires double confirmation) |

---

## Multi-Room Booking

### Creating Multi-Room Bookings
1. Drag to select cells across multiple rooms
2. Consecutive dates are grouped into single reservations
3. Non-consecutive dates create separate reservations
4. Confirmation shows: `X rooms × Y total nights`

### Booking Process
1. Enter guest details once
2. All selected rooms are booked with same guest
3. Each room gets its own reservation record
4. Special requests note which booking number (e.g., "Multi-room booking (2 of 3)")

---

## Group Reservation Handling

### Automatic Detection
Reservations are detected as "related" when they share:
- Same guest
- Same check-in and check-out dates
- Same booking source and agent
- Same meal plan
- Created within 30 seconds of each other

### Group Actions

#### Edit Group
- **Edit All**: Modify all related reservations together
- **Edit Single**: Modify only the clicked reservation

#### Cancel Group
- Cancels all related reservations together
- Shows confirmation with count of affected reservations

#### Delete Group
- Permanently deletes all related reservations
- Requires double confirmation due to irreversibility

---

## Modals

### QuickBookingModal
Create new reservations with:
- Booking source (Direct/Agent)
- Guest selection (with inline add option)
- Room assignment
- Check-in/Check-out dates
- Number of guests (adults/children/infants)
- Meal plan selection
- Status (Confirmed/Hold)
- Special requests

### AddGuestModal
- Add new guest inline during booking process
- Returns to booking modal with new guest selected

### AddAgentModal
- Add new travel agent inline during booking
- Returns to booking modal with new agent selected

### EditBookingModal
- Modify existing reservation details
- Supports both single and group editing
- Can change dates, guest, room, meal plan, etc.

### RoomStatusModal
- Change room status (Available/Blocked/Maintenance)
- Used when blocking rooms from calendar

---

## Keyboard & Mouse Interactions

| Interaction | Action |
|-------------|--------|
| **Click empty cell** | Open action menu |
| **Click reservation** | Open reservation menu |
| **Click + Drag** | Multi-cell selection |
| **Click outside menu** | Close open menus |
| **Click room type row** | Expand/collapse rooms |

---

## Data Integration

### Contexts Used
- `ReservationContext` - Reservations CRUD operations
- `RoomContext` - Rooms and room types
- `MealPlanContext` - Available meal plans
- `GuestContext` - Guest database
- `AgentContext` - Travel agent database
- `AlertContext` - Confirmation dialogs and alerts

### Auto-Refresh
- Manual refresh button available
- Data refreshes after booking/edit/cancel/delete operations

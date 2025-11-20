# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Instructions

**CRITICAL: Follow these rules for all tasks:**

1. **Do NOT create documentation files** - Do not produce `.md` files, guides, or documentation unless explicitly requested by the user. Focus on code implementation only.

2. **Do NOT create migration files** - This project has Supabase MCP tools connected. When database changes are needed:
   - Use the `mcp__supabase__apply_migration` tool directly to apply schema changes
   - Use the `mcp__supabase__execute_sql` tool for data operations
   - Do NOT create `.sql` files in a `database/migrations/` folder
   - Make all database changes immediately using the MCP tools

3. **ALWAYS implement code changes automatically** - Never instruct the user to make code changes manually:
   - ❌ BAD: "In `ReservationDetails.jsx`, replace line 32 with..."
   - ❌ BAD: "Update the import statement to use..."
   - ✅ GOOD: Use the Edit tool to make the changes directly
   - If multiple files need updates, make ALL changes automatically
   - Only tell the user what was changed AFTER making the changes
   - The user should never have to manually edit code based on your instructions

4. **Do NOT create "Enhanced" versions of files** - When improving existing code:
   - ❌ BAD: Create `EnhancedFolioTab.jsx` as a new file
   - ✅ GOOD: Directly enhance the existing `FolioTab.jsx` file
   - Modify files in place rather than creating new versions
   - Use the Edit tool to update existing files with improvements
   - This keeps the codebase clean and avoids duplicate files

5. **Supabase MCP Tools Available:**
   - `mcp__supabase__list_tables` - List tables in schemas
   - `mcp__supabase__apply_migration` - Apply DDL operations (CREATE, ALTER, DROP)
   - `mcp__supabase__execute_sql` - Execute SQL queries
   - Use these tools instead of generating migration files

## Project Overview

A full-stack hotel management system built with React + Vite, Supabase backend, and Tailwind CSS. The application manages rooms, reservations, billing, inventory, guests, agents, expenses, and reporting for hotel operations.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (default: http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Deploy to Vercel
npm run deploy
```

## Architecture Overview

### Frontend Stack
- **Framework**: React 19 with Vite 7
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Backend**: Supabase (PostgreSQL + Auth)

### Application Structure

The application uses a **Context-based state management** architecture with multiple domain-specific providers:

1. **AuthContext** (`src/context/AuthContext.jsx`) - User authentication and session management
2. **RoomContext** (`src/context/RoomContext.jsx`) - Room types and room management
3. **ReservationContext** (`src/context/ReservationContext.jsx`) - Bookings and check-in/out
4. **BillingContext** (`src/context/BillingContext.jsx`) - Bills and payments
5. **GuestContext** (`src/context/GuestContext.jsx`) - Guest profiles
6. **AgentContext** (`src/context/AgentContext.jsx`) - Travel agents/partners
7. **InventoryContext** (`src/context/InventoryContext.jsx`) - Stock management
8. **ExpensesContext** (`src/context/ExpensesContext.jsx`) - Expense tracking

All contexts are nested in `src/App.jsx` with AuthProvider as the root.

### Routing & Navigation

The app uses a **custom page-based routing system** (NOT react-router in the traditional sense):
- Navigation is handled via `currentPage` state in `Layout.jsx`
- Pages are conditionally rendered based on state
- The Sidebar component triggers navigation by calling `setCurrentPage()`

### Database Layer

Supabase client and all API helpers are centralized in `src/lib/supabase.js`. This file exports:
- Pre-configured Supabase client
- Helper functions for all CRUD operations (auth, rooms, reservations, bills, etc.)
- All functions follow `{ data, error }` return pattern

**Important**: Database fields use `snake_case` (e.g., `room_number`, `check_in_date`), but components may use camelCase. Convert between conventions when passing data to/from Supabase.

### Component Organization

```
src/
├── components/
│   ├── common/        # Reusable components (Button, Card, Modal, ConfirmModal)
│   ├── ui/            # shadcn/ui components (button, dialog, input, select, etc.)
│   ├── layout/        # Header, Sidebar, Layout (main app structure)
│   ├── rooms/         # Room-specific components
│   ├── reservations/  # Booking modals and summaries
│   ├── guests/        # Guest management components
│   └── agents/        # Agent management components
├── pages/             # Full page components (Dashboard, Rooms, Billing, etc.)
├── context/           # React Context providers
├── lib/               # Supabase client and utilities
└── utils/             # Helper functions and constants
```

### Key Features & Business Logic

#### Check-in Process
When a reservation is checked in (`ReservationContext.checkIn()`):
1. Updates reservation status to "Checked-in"
2. Updates room status to "Occupied"
3. **Auto-creates a Room Charge bill** with items for each night
4. Calculates nights, applies 18% GST

#### Room Status Management
Room statuses: `Available`, `Occupied`, `Maintenance`, `Blocked`
- Status changes are reflected immediately in UI and database
- Room status is automatically updated during check-in/check-out

#### Bill Generation
Bills are created with:
- Bill items (line items) stored in separate `bill_items` table
- Automatic tax calculation (18% GST)
- Payment tracking with balance calculation

#### Expense Management
Uses a flexible spreadsheet-like system:
- Expense categories contain sheets
- Sheets have customizable columns (configurable types and order)
- Rows store expense data with `custom_data` JSONB field

## Supabase Configuration

Environment variables required in `.env`:
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Authentication uses Supabase Auth with a separate `users` table linked via `auth_id`.

## Styling Guidelines

This project uses **Tailwind CSS v4** with shadcn/ui:
- Use Tailwind utility classes for styling
- CSS Modules (`.module.css`) are used sparingly for complex component styles
- CSS variables for theming are defined in `src/index.css` using HSL colors
- The `cn()` utility from `lib/utils.js` combines Tailwind classes with clsx

**Important**: There's a mix of Tailwind v3 and v4 configuration. Some commented lines reference the Tailwind Vite plugin that's not currently active.

## Common Patterns

### Creating a New Feature
1. Define Supabase helper functions in `lib/supabase.js`
2. Create a Context provider if needed (follow existing patterns)
3. Build page component in `src/pages/`
4. Add reusable sub-components in appropriate `src/components/` folder
5. Register page in `Layout.jsx` pages object and navigation

### Data Fetching
All data fetching uses async/await with Supabase client:
```javascript
const { data, error } = await supabase.from('table').select('*')
if (error) {
  console.error('Error:', error)
  alert('Failed: ' + error.message)
  return
}
```

### Modal Pattern
Modals use shadcn/ui Dialog components wrapped in custom components:
- Use `open` prop for visibility state
- Use `onOpenChange` for close handling
- Follow existing modal components like `QuickBookingModal.jsx`

## Known Issues & Technical Debt

1. **Tailwind v4 Migration**: Some Tailwind v4 imports are commented out in `vite.config.js` and `src/App.jsx`, indicating an incomplete migration from v3 to v4.

2. **Error Handling**: Uses `alert()` for user-facing errors. Consider implementing a toast notification system.

3. **Foreign Key Constraints**: Deletion operations check for constraint errors (code `23503`) and show user-friendly messages.

4. **No TypeScript**: Project uses JavaScript. Field name mismatches (camelCase vs snake_case) can cause runtime errors.

## Database Schema Notes

Key tables:
- `users` - Staff/admin users (linked to Supabase Auth)
- `room_types` - Room categories with base pricing
- `rooms` - Individual rooms with type, floor, category, status
- `guests` - Guest profiles
- `agents` - Travel agents/partners
- `reservations` - Bookings with foreign keys to guests, rooms, agents
- `bills` / `bill_items` - Billing with line items
- `payments` - Payment records
- `inventory_items` / `inventory_transactions` - Stock management
- `expense_categories` / `expense_sheets` / `expense_columns` / `expense_rows` - Flexible expense tracking
- `hotel_settings` - Key-value configuration storage

Most tables include `created_at` and `updated_at` timestamps.

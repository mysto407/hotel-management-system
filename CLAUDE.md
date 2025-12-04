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

6. **ALWAYS use Git for version control** - Follow the Branch-Per-Task workflow:
   - ✅ ALWAYS create a feature branch BEFORE starting any work
   - ✅ ALWAYS commit changes after completing each logical unit of work
   - ✅ Use descriptive commit messages following conventional format
   - ❌ NEVER work directly on the `main` branch
   - See the "Git Workflow" section below for detailed instructions

7. **Do NOT use `type="number"` inputs** - Never use number inputs with browser spinners:
   - ❌ BAD: `<Input type="number" />` - Has ugly spinner arrows
   - ✅ GOOD: `<Input type="text" inputMode="decimal" />` - For decimal numbers (amounts, prices)
   - ✅ GOOD: `<Input type="text" inputMode="numeric" />` - For integers (quantity, count)
   - Add validation in onChange to only allow numeric input: `/^\d*\.?\d*$/` for decimals, `/^\d*$/` for integers
   - This gives numeric keyboard on mobile without the spinner arrows

8. **Shorthand: "cpm" means Commit, Push, and Merge** - When the user says "cpm":
   - Commit all current changes with appropriate message
   - Push the branch to remote
   - Merge the branch into main
   - Delete the feature branch after successful merge

## Git Workflow (Branch-Per-Task Strategy)

This project uses a **Branch-Per-Task** workflow to enable easy review and reversion of changes. Every feature, fix, or refactoring gets its own branch.

### Workflow Overview

```
main (stable, always deployable)
  ├── feature/add-meal-plan-editor
  ├── feature/guest-search-improvements
  ├── fix/date-calculation-bug
  └── refactor/cleanup-billing-context
```

### Step-by-Step Process

#### 1. Before Starting ANY Work
**ALWAYS create a feature branch first:**

```bash
# For new features
git checkout -b feature/short-descriptive-name

# For bug fixes
git checkout -b fix/bug-description

# For refactoring
git checkout -b refactor/what-youre-refactoring
```

**Examples:**
- `feature/add-invoice-pdf-export`
- `fix/reservation-date-overlap`
- `refactor/simplify-room-context`

#### 2. After Making Changes
**ALWAYS commit after completing each logical change:**

When you finish implementing a feature, fixing a bug, or making a meaningful change, create a commit immediately. Use this format:

```bash
git add .
git commit -m "type: Brief description of what changed

More detailed explanation if needed (optional).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### 3. Commit Message Format

Use **conventional commit format** with these types:

- `feat:` - New feature or functionality
  - Example: `feat: Add PDF export for invoices`
- `fix:` - Bug fix
  - Example: `fix: Correct date calculation in billing system`
- `refactor:` - Code restructuring without changing behavior
  - Example: `refactor: Simplify ReservationContext state management`
- `style:` - UI/styling changes
  - Example: `style: Update reservation card layout`
- `perf:` - Performance improvement
  - Example: `perf: Optimize guest search query`
- `docs:` - Documentation changes (rare, per rule #1)
  - Example: `docs: Update CLAUDE.md with Git workflow`
- `chore:` - Maintenance tasks (dependencies, config)
  - Example: `chore: Update dependencies to latest versions`

**Important:** Focus on WHAT changed and WHY, not HOW (the code shows how).

#### 4. Review Changes Before Merging

Before merging your branch to `main`, review what changed:

```bash
# See all changes compared to main
git diff main

# See commit history
git log --oneline

# See changed files
git diff main --name-only
```

#### 5. Merge or Discard

**Option A: Keep the changes (merge to main)**
```bash
git checkout main
git merge feature/your-feature-name
git push origin main
git branch -D feature/your-feature-name  # Delete the branch
```

**Option B: Discard all changes (delete the branch)**
```bash
git checkout main
git branch -D feature/your-feature-name  # All changes lost
```

**Option C: Keep only some commits (cherry-pick)**
```bash
git checkout main
git cherry-pick <commit-hash1> <commit-hash2>
git push origin main
git branch -D feature/your-feature-name
```

### GitHub Integration

#### Push branches to GitHub
```bash
# Push feature branch to GitHub (for backup or collaboration)
git push origin feature/your-feature-name

# Push main after merging
git push origin main
```

#### Create Pull Requests
If you want to review changes on GitHub before merging:
```bash
# Create PR using GitHub CLI (if installed)
gh pr create --title "Feature: Your feature name" --body "Description of changes"
```

Or manually create a PR on GitHub web interface.

### Quick Reference

| Task | Command |
|------|---------|
| Create feature branch | `git checkout -b feature/name` |
| Create fix branch | `git checkout -b fix/bug-name` |
| Commit changes | `git add . && git commit -m "type: message"` |
| View changes | `git diff main` |
| View commits | `git log --oneline` |
| Switch to main | `git checkout main` |
| Merge branch | `git merge feature/name` |
| Delete branch | `git branch -D feature/name` |
| Push to GitHub | `git push origin main` |

### Example Workflow Session

```bash
# 1. Start new feature
git checkout -b feature/add-room-service-menu

# 2. Claude makes changes and commits
# (Multiple commits as work progresses)

# 3. Review changes
git diff main
git log --oneline

# 4. Happy with changes? Merge!
git checkout main
git merge feature/add-room-service-menu
git push origin main
git branch -D feature/add-room-service-menu

# 5. Not happy? Discard!
git checkout main
git branch -D feature/add-room-service-menu
```

### Important Notes

- **Never commit directly to `main`** - Always use a feature branch
- **Commit frequently** - Each logical change should be a commit
- **Descriptive messages** - Future you will thank present you
- **Review before merging** - Use `git diff main` to see all changes
- **Push regularly** - Backup your work to GitHub

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
- **ALWAYS use shadcn/ui components for UI elements** - Use components from `src/components/ui/` (button, dialog, input, select, card, etc.) rather than building custom HTML/styled elements
- Use Tailwind utility classes for styling
- CSS Modules (`.module.css`) are used sparingly for complex component styles
- CSS variables for theming are defined in `src/index.css` using HSL colors
- The `cn()` utility from `lib/utils.js` combines Tailwind classes with clsx

**Important**: There's a mix of Tailwind v3 and v4 configuration. Some commented lines reference the Tailwind Vite plugin that's not currently active.

### Semantic Color System

This project uses **CSS variable-based semantic colors** that automatically adapt to light/dark mode. Never use manual `dark:` overrides for status colors.

#### Available Semantic Colors

| Color | Purpose | Example Usage |
|-------|---------|---------------|
| `success` | Positive states, paid, confirmed, available | Paid badges, positive balances, active status |
| `warning` | Caution states, partial, tentative | Partial payments, tentative bookings |
| `destructive` | Negative states, errors, cancelled, unpaid | Unpaid badges, error states, delete actions |
| `info` | Informational, neutral actions, edit | Info banners, edit buttons, extended stay |
| `orange` | Pending states, hold, balance due | Hold status, pending balance, room moves |
| `purple` | Special states, inquiry, meal plans | Inquiry status, meal plan badges, commissions |

#### How It Works

Colors are defined in two places:
1. **CSS Variables** (`src/index.css`) - HSL values for light and dark modes
2. **Tailwind Config** (`tailwind.config.js`) - Maps CSS variables to Tailwind classes

#### Usage Patterns

```jsx
// Text colors
<span className="text-success">Paid</span>
<span className="text-destructive">Unpaid</span>
<span className="text-warning">Partial</span>

// Background with opacity (for badges/pills)
<span className="bg-success/20 text-success">Confirmed</span>
<span className="bg-warning/20 text-warning">Tentative</span>
<span className="bg-info/10 text-info-foreground">Info Banner</span>

// Borders
<div className="border border-success/50">...</div>
<div className="border-destructive/30">...</div>

// Foreground variants (for better contrast on colored backgrounds)
<span className="text-success-foreground">...</span>
```

#### DO NOT use manual dark mode overrides

```jsx
// ❌ BAD - Manual dark mode overrides
<span className="text-green-600 dark:text-green-400">Paid</span>
<span className="text-red-600 dark:text-red-400">Unpaid</span>

// ✅ GOOD - Semantic colors (auto dark mode)
<span className="text-success">Paid</span>
<span className="text-destructive">Unpaid</span>
```

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

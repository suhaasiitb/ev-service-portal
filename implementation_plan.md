# Technician Individual Login and Tracking

This plan outlines the architectural changes required to shift from a shared station login to individual technician logins, along with job tracking and UI updates.

## Proposed Changes

### 1. Database Schema Updates (Supabase)
To support individual logins and active job tracking, we need the following schema modifications:
- **`users` table**: Add `name` (text), `role` (text) to store technician details. The `station_id` already exists.
- **`technician_jobs` table (NEW)**: Create a table to track active jobs.
  - `id` (uuid, PK)
  - `technician_id` (uuid, FK to users)
  - `job_type` (text - 'ticket', 'walkin', 'pdi', 'repair')
  - `job_id` (uuid, reference to the respective table)
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz, nullable)
  - `status` (text - 'active', 'completed')

### 2. Authentication Flow
- Technicians will log in with their own email addresses (which must be created in Supabase Auth and mapped in the `users` table with their `station_id`).
- The `AuthProvider` will remain largely the same, but we will add a `useUser` hook (or extend `useAuth`) to fetch the technician's `name` and `role` from the `users` table.

### 3. UI Updates (Forms & Modals)
- **Remove Dropdowns**: In all job modals (`CreateWalkInModal.tsx`, `CloseTicketModal.tsx`, `CloseRepairModal.tsx`, `CompletePdiModal.tsx`), we will remove the `engineers.map` dropdowns.
- **Auto-assign**: The `engineer_id` (or `closed_by`, etc.) will automatically be set to the logged-in user's UUID.
- **Display Name**: The UI will display a read-only badge indicating "Assigned to: [Logged-in User's Name]".

### 4. Dashboard & Job Tracking
- **New Dashboard Widget**: Add an "Active Job" section below the summary tiles in `app/(tabs)/index.tsx`.
- **Active Job Hook**: Create `useActiveJob.ts` to fetch the current active job from the `technician_jobs` table (where `status = 'active'` and `technician_id = session.user.id`).
- **Idle State**: If no active job is found, display an "Idle" state with a timer or simply "No active job. Select a task to begin."
- **Starting a Job**: When a user selects a job from the lists (Tickets, Walkins, etc.), they will be prompted to "Start Work". This will insert a row into `technician_jobs`.
- **Closing a Job**: The existing "Close/Resolve" modals will update the original ticket AND mark the `technician_jobs` row as `completed`, calculating total time.

### 5. Future (Post-Implementation)
- Storing station coordinates in the `stations` table.
- A new Attendance screen for selfie capture and GPS validation (distance < 150m).

## User Review Required
> [!IMPORTANT]
> **Database Changes**: The changes to the database require creating a new table (`technician_jobs`). Are you able to run SQL commands in your Supabase dashboard to create this table? I can provide the exact SQL script.
> **Job Flow**: Currently, resolving a ticket opens a modal instantly. With the new flow, should clicking a ticket immediately "Start" the job (creating an active timer), and then a separate button "Complete" opens the resolution modal?

## Verification Plan
1. Ensure the user can log in with a distinct email.
2. Ensure the correct `station_id` and tasks still load.
3. Test starting a ticket (should appear on the dashboard with a live timer).
4. Test completing a ticket (should clear the dashboard timer and resolve the ticket).

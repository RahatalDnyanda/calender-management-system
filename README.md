# Zenith Calendar: A Minimalist Calendar Management System

This project is a full-stack calendar management system built to demonstrate robust backend logic and a modern, interactive frontend. It allows users to create, view, and manage events with a focus on correct time handling, conflict detection, and advanced features like recurring events and drag-and-drop rescheduling.

## Architecture Overview

The system is structured as a **monorepo** containing two main packages:

*   **`backend`**: A Node.js/Express server that provides a RESTful API for event management. It uses Prisma as its ORM to interact with a PostgreSQL database. All date/time data is stored in UTC.
*   **`frontend`**: A React single-page application built with Vite and TypeScript. It provides a weekly calendar view and a form for creating events. It communicates with the backend API. Styling is done with Tailwind CSS.

### Tech Stack

*   **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL, `rrule`
*   **Frontend**: React, TypeScript, Vite, Tailwind CSS, `date-fns`, `dnd-kit`, `rrule`
*   **Monorepo Tooling**: npm Workspaces, `concurrently`

## Key Features

*   **Full Event Management**: Create, update, and delete calendar events.
*   **Recurring Events**: Create events that repeat daily, weekly, monthly, or yearly using the iCalendar `RRULE` standard.
*   **Drag-and-Drop Rescheduling**: Intuitively move events to new time slots. Moving a single instance of a recurring event automatically creates an exception.
*   **Robust Conflict Detection**: Prevents overlapping events from being created or updated.
*   **Timezone-Safe**: All event times are handled in UTC on the backend and displayed in the user's local time on the frontend.
*   **Interactive Weekly View**: Navigate through weeks and view events laid out in a clear grid.
*   **Modern UI/UX**:
    *   A sleek modal for creating and editing events.
    *   Dark and light mode support with a theme toggle.
    *   Smooth animations and loading states.

## Setup and Run Instructions

The project uses an npm workspace-based monorepo. All commands should be run from the root directory.

### Prerequisites

*   Node.js (v18 or later)
*   npm (v7 or later, for workspace support)
*   A running PostgreSQL database instance.

### 1. Environment Setup

The backend requires a `.env` file to connect to your database.

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Create a `.env` file by copying the example:
    ```bash
    cp .env.example .env
    ```
3.  Open the new `.env` file and replace the placeholder values with your actual PostgreSQL connection details.

    ```env
    # Example .env content
    DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/your_db_name?schema=public"
    DIRECT_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/your_db_name?schema=public"
    ```
4.  Return to the root directory:
    ```bash
    cd ..
    ```

### 2. Install Dependencies

From the **root** of the project, run `npm install`. This will install dependencies for the root, the backend, and the frontend workspaces.

```bash
npm install
```

### 3. Run Database Migrations

With your database running and the `.env` file configured, run the Prisma migration command from the root directory. This will set up the required tables in your database.

```bash
npm exec --workspace=backend -- npx prisma migrate dev
```
*(You may be prompted to give your migration a name, like `init`)*.

### 4. Start the Development Servers

From the **root** of the project, run the `dev` script. This will start both the backend and frontend servers concurrently.

```bash
npm run dev
```
The backend will be running on `http://localhost:3000`.

### 2. Frontend Setup

```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the frontend development server
npm run dev
```
The frontend will be available at `http://localhost:5173`.

## Key Assumptions and Decisions

*   **Timezone Handling**: All dates are handled and stored in UTC on the backend. The frontend is responsible for converting these UTC dates to the user's local time for display. This ensures data consistency regardless of user location.
*   **Conflict Resolution**: The system prevents the creation of any event that overlaps with an existing one. The API returns a `409 Conflict` error, which is communicated to the user.
*   **Persistence**: A PostgreSQL database is used for persistence, managed via Prisma. This provides a robust and scalable storage solution.
*   **UI Simplicity**: The focus was on the correctness of the calendar logic, not UI polish. The UI is minimal but functional.

## Known Limitations & Future Improvements

*   **No Event Updates**: The current version does not support editing an event after it has been created.
*   **Single User/Calendar**: The system is not multi-tenant and assumes a single calendar for a single user.
*   **No Recurring Events**: The data model does not support recurring events.
*   **UI Refinement**: The main `Calendar.tsx` component is large and could be broken down into smaller components. The UI could also be made more responsive.

With more time, I would:
1.  Implement the "Update Event" functionality.
2.  Add user authentication and support for multiple calendars.
3.  Design and implement a schema for recurring events.
4.  Refactor the frontend components for better maintainability.
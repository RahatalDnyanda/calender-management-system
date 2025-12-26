# Minimalist Calendar Management System

This project is a minimal, full-stack calendar management system that allows users to create, view, and manage events in a weekly view, with a focus on correct conflict detection.

## Architecture Overview

The system is a monorepo containing two main packages:

*   **`backend`**: A Node.js/Express server that provides a RESTful API for event management. It uses Prisma as its ORM to interact with a PostgreSQL database. All date/time data is stored in UTC.
*   **`frontend`**: A React single-page application built with Vite and TypeScript. It provides a weekly calendar view and a form for creating events. It communicates with the backend API. Styling is done with Tailwind CSS.

### Tech Stack

*   **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL
*   **Frontend**: React, TypeScript, Vite, Tailwind CSS, date-fns

## Setup and Run Instructions

### Prerequisites

*   Node.js (v18 or later)
*   npm
*   PostgreSQL database running

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Create a .env file from the example
# cp .env.example .env
# NOTE: You will need to create a .env file and add your DATABASE_URL and DIRECT_URL
# Example .env:
# DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
# DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# Run database migrations
npx prisma migrate dev --name init

# Start the backend server
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
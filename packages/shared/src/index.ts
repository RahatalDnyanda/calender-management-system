// The shape of an Event as it comes from the DB
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string; // ISO 8601 String (e.g., "2023-10-27T10:00:00Z")
  end_time: string;
  created_at?: string;
}

// The shape of data needed to create an event
export interface CreateEventDto {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
}

// Standard API Response structure
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
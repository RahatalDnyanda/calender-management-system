import axios from 'axios';

const API_URL = 'http://localhost:3000/events';

// The 'export' here is crucial
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; 
  endTime: string;
  // Recurrence properties from the backend
  rrule?: string;
  isRecurringInstance?: boolean;
  masterId?: string;
  recurrenceId?: string;
  originalStartTime?: string;
}

export const fetchEvents = async (start: string, end: string) => {
  const response = await axios.get<CalendarEvent[]>(API_URL, {
    params: { start, end },
  });
  return response.data;
};

export const createEvent = async (data: Partial<CalendarEvent>) => {
  const response = await axios.post<CalendarEvent>(API_URL, {
    title: data.title,
    startTime: data.startTime,
    endTime: data.endTime,
    rrule: data.rrule,
    // For creating exceptions
    recurrenceId: data.recurrenceId,
    originalStartTime: data.originalStartTime,
    isCancelled: data.isCancelled,
  });
  return response.data;
};

export const updateEvent = async (id: string, title: string, startTime: string, endTime: string, rrule?: string) => {
  const response = await axios.put<CalendarEvent>(`${API_URL}/${id}`, {
    title,
    startTime,
    endTime,
    rrule,
  });
  return response.data;
};

export const deleteEvent = async (id: string) => {
  await axios.delete(`${API_URL}/${id}`);
};
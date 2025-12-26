import axios from 'axios';

const API_URL = 'http://localhost:3000/events';

// The 'export' here is crucial
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; 
  endTime: string;   
}

export const fetchEvents = async (start: string, end: string) => {
  const response = await axios.get<CalendarEvent[]>(API_URL, {
    params: { start, end },
  });
  return response.data;
};

export const createEvent = async (title: string, startTime: string, endTime: string) => {
  const response = await axios.post<CalendarEvent>(API_URL, {
    title,
    startTime,
    endTime,
  });
  return response.data;
};

export const updateEvent = async (id: string, title: string, startTime: string, endTime: string) => {
  const response = await axios.put<CalendarEvent>(`${API_URL}/${id}`, {
    title,
    startTime,
    endTime,
  });
  return response.data;
};

export const deleteEvent = async (id: string) => {
  await axios.delete(`${API_URL}/${id}`);
};
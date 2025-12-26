import React, { useEffect, useState } from 'react';
import { startOfWeek, addDays, format, startOfDay, addHours } from 'date-fns';
import { fetchEvents, createEvent, deleteEvent, type CalendarEvent } from '../api';
import { clsx } from 'clsx';
import { Trash2 } from 'lucide-react';

export const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStartHour, setSelectedStartHour] = useState('09:00');
  const [selectedEndHour, setSelectedEndHour] = useState('10:00');
  const [error, setError] = useState<string | null>(null);

  // Date Math: Get start/end of current week
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const endDate = addDays(startDate, 7);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await fetchEvents(startDate.toISOString(), endDate.toISOString());
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Combine Date + Time
      const startDateTime = new Date(`${selectedDate}T${selectedStartHour}:00`);
      const endDateTime = new Date(`${selectedDate}T${selectedEndHour}:00`);

      await createEvent(title, startDateTime.toISOString(), endDateTime.toISOString());
      setTitle('');
      await loadEvents(); // Refresh UI
    } catch (err: any) {
      // Handle the "Conflict" error from backend
      if (err.response && err.response.status === 409) {
        setError("❌ Conflict! This time slot overlaps with another event.");
      } else {
        setError("Failed to create event.");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Delete this event?")) return;
    await deleteEvent(id);
    loadEvents();
  };

  // Helper to position events on the grid
  const getEventStyle = (event: CalendarEvent) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    
    // Calculate Grid Row (Time)
    // Assuming grid starts at 00:00. Each hour is roughly 60px height.
    const startHour = start.getHours() + (start.getMinutes() / 60);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    // Calculate Grid Column (Day of Week)
    // 0 = Sunday, 1 = Monday. Our grid starts Monday (col 2)
    let dayIndex = start.getDay(); 
    dayIndex = dayIndex === 0 ? 7 : dayIndex; // Make Sunday 7

    return {
      gridColumn: dayIndex + 1, // +1 because first col is time labels
      gridRowStart: Math.floor(startHour * 1) + 2, // +2 for header offset
      height: `${duration * 100}%`, // Rough CSS scaling
      top: `${(start.getMinutes() / 60) * 100}%` 
    };
  };

  const days = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));
  const hours = Array.from({ length: 24 }).map((_, i) => i);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header & Controls */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📅 Weekly Planner</h1>
        <div className="space-x-4">
          <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="px-4 py-2 bg-gray-200 rounded">← Prev</button>
          <span className="font-medium">{format(startDate, 'MMM d')} - {format(addDays(startDate, 6), 'MMM d, yyyy')}</span>
          <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="px-4 py-2 bg-gray-200 rounded">Next →</button>
        </div>
      </div>

      {/* Simple Form */}
      <form onSubmit={handleCreate} className="mb-8 p-4 bg-gray-50 rounded-lg flex gap-4 items-end flex-wrap">
        <div>
            <label className="block text-sm font-bold">Event Title</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} className="border p-2 rounded" placeholder="Meeting..." />
        </div>
        <div>
            <label className="block text-sm font-bold">Date</label>
            <input required type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border p-2 rounded" />
        </div>
        <div>
            <label className="block text-sm font-bold">Start</label>
            <input required type="time" value={selectedStartHour} onChange={e => setSelectedStartHour(e.target.value)} className="border p-2 rounded" />
        </div>
        <div>
            <label className="block text-sm font-bold">End</label>
            <input required type="time" value={selectedEndHour} onChange={e => setSelectedEndHour(e.target.value)} className="border p-2 rounded" />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Add Event</button>
        {error && <span className="text-red-600 font-bold ml-4">{error}</span>}
      </form>

      {/* Calendar Grid */}
      <div className="grid grid-cols-8 border border-gray-200 rounded-lg overflow-hidden bg-white shadow">
        {/* Header Row */}
        <div className="p-4 border-b border-r bg-gray-50">Time</div>
        {days.map(day => (
          <div key={day.toString()} className={clsx("p-4 border-b text-center font-semibold", 
            format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "bg-blue-50 text-blue-600" : "bg-gray-50"
          )}>
            {format(day, 'EEE d')}
          </div>
        ))}

        {/* Time Slots & Events */}
        {hours.map(hour => (
          <React.Fragment key={hour}>
            {/* Time Label */}
            <div className="border-r border-b text-xs text-gray-400 p-2 text-right h-20">
              {format(addHours(startOfDay(new Date()), hour), 'h a')}
            </div>
            
            {/* 7 Empty Cells for Grid Structure */}
            {days.map((day, i) => (
               <div key={i} className="border-b border-r relative h-20 group hover:bg-gray-50">
                 {/* This is a visual grid cell */}
               </div>
            ))}
          </React.Fragment>
        ))}

        {/* Render Events OVER the grid (Absolute Positioning Trick) */}
        {events.map(event => {
            const start = new Date(event.startTime);
            const dayIndex = start.getDay() === 0 ? 7 : start.getDay(); // Adjust Sunday
            const startHour = start.getHours() + (start.getMinutes() / 60);
            const durationHours = (new Date(event.endTime).getTime() - start.getTime()) / (1000 * 60 * 60);
            
            // Grid Row Math: Header is Row 1. 
            // Hours start at Row 2. 
            // We need to map time to grid coordinates strictly.
            // Simplified approach: Render strictly based on absolute position within a container overlay if we were fancy.
            // But for CSS Grid:
            const gridRowStart = Math.floor(startHour) + 2; // +2 accounts for Header row + 1-based index
            
            return (
                <div 
                  key={event.id}
                  className="m-1 p-2 rounded bg-blue-100 border-l-4 border-blue-500 text-xs overflow-hidden absolute w-[11%] z-10 hover:shadow-lg transition-shadow"
                  style={{
                      // This part is tricky in pure grid without sub-grids.
                      // Fallback: We render them in a separate overlay or use exact grid placement.
                      // Let's use the Grid Placement strategy:
                      gridColumn: dayIndex + 1,
                      gridRowStart: gridRowStart,
                      marginTop: `${(start.getMinutes() / 60) * 5}rem`, // Offset within the cell
                      height: `${durationHours * 5}rem`, // 5rem = h-20 (80px)
                  }}
                >
                    <div className="font-bold flex justify-between">
                        {event.title}
                        <button onClick={() => handleDelete(event.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                    </div>
                    <div>{format(start, 'h:mm')} - {format(new Date(event.endTime), 'h:mm')}</div>
                </div>
            )
        })}
      </div>
    </div>
  );
};
import React, { useEffect, useState, useRef } from 'react';
import { startOfWeek, addDays, format, startOfDay, addHours, isSameDay, getDay, add, roundToNearestMinutes } from 'date-fns';
import { fetchEvents, createEvent, updateEvent, deleteEvent, type CalendarEvent } from '../api';
import { ChevronLeft, ChevronRight, Trash2, Calendar as CalendarIcon, AlertCircle, Plus, LoaderCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { EventModal } from './EventModal';
import { ThemeToggle } from './ThemeToggle';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DraggableEventProps {
  event: CalendarEvent;
  children: React.ReactNode;
  style: React.CSSProperties;
}

const DraggableEvent = ({ event, children, style: positionStyle }: DraggableEventProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.id, data: { event } });
  const style = {
    ...positionStyle,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1, // Make the original item semi-transparent while dragging
  };
  return <div ref={setNodeRef} style={style} className="absolute" {...listeners} {...attributes}>{children}</div>;
};

export const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date>(new Date());
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch a wide range to be safe (previous week to next week)
      const startRange = addDays(startDate, -7).toISOString();
      const endRange = addDays(startDate, 14).toISOString();
      const data = await fetchEvents(startRange, endRange);
      setEvents(data);
    } catch (err) {
      setError("Failed to load events. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 }, // Require a 10px drag to start
    })
  );

  const handleDragStart = (event: any) => {
    setActiveEvent(event.active.data.current?.event ?? null);
  };

  const handleDragEnd = async (event: any) => {
    const { active, delta } = event;
    setActiveEvent(null);

    const draggedEvent = active.data.current?.event as CalendarEvent;
    if (!draggedEvent || (delta.x === 0 && delta.y === 0) || !gridRef.current) {
      return;
    }

    // --- Calculate new times from drag delta ---
    const dayWidth = gridRef.current.offsetWidth / 8; // 8 columns
    const hourHeight = 80; // h-20 = 5rem = 80px

    const daysDragged = Math.round(delta.x / dayWidth);
    const minutesDragged = Math.round((delta.y / hourHeight) * 60);

    const originalStart = new Date(draggedEvent.startTime);
    const duration = new Date(draggedEvent.endTime).getTime() - originalStart.getTime();

    let newStart = add(originalStart, { days: daysDragged, minutes: minutesDragged });
    newStart = roundToNearestMinutes(newStart, { nearestTo: 15 }); // Snap to 15-min intervals
    const newEnd = new Date(newStart.getTime() + duration);

    // --- Optimistic Update ---
    const originalEvents = [...events];
    setEvents(prev => prev.map(e => e.id === draggedEvent.id ? { ...e, startTime: newStart.toISOString(), endTime: newEnd.toISOString() } : e));

    // --- API Call ---
    try {
      // If it's a recurring instance, we create a new "exception" event.
      if (draggedEvent.isRecurringInstance) {
        await createEvent({
          title: draggedEvent.title,
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
          recurrenceId: draggedEvent.masterId,
          originalStartTime: draggedEvent.startTime, // The original time of the instance we're moving
        });
      } else {
        // Otherwise, it's a simple update.
        await updateEvent(draggedEvent.id, draggedEvent.title, newStart.toISOString(), newEnd.toISOString());
      }
      await loadEvents(); // Reload to get official data and new IDs
    } catch (err) {
      setError("Failed to move event. It might conflict with another.");
      setEvents(originalEvents); // Revert on failure
    }
  };

  const handleSaveEvent = async (data: Partial<CalendarEvent> & { id?: string }) => {
    const isEditingRecurringInstance = eventToEdit?.isRecurringInstance;

    // If we are "editing" a recurring instance, we must create an exception event.
    if (isEditingRecurringInstance) {
      await createEvent({
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        recurrenceId: eventToEdit.masterId,
        originalStartTime: eventToEdit.startTime, // The original time of the instance we're editing
      });
    } 
    // If we are editing a master or single event
    else if (data.id) {
      await updateEvent(data.id, data.title!, data.startTime!, data.endTime!, data.rrule);
    } 
    // If we are creating a new event (could be single or recurring)
    else {
      await createEvent(data);
    }
    await loadEvents(); // Reload all events to show changes
  };

  const openAddModal = (date: Date) => {
    setEventToEdit(null);
    setModalInitialDate(date);
    setIsModalOpen(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEventToEdit(event);
    setIsModalOpen(true);
  };

  const handleDelete = async (eventToDelete: CalendarEvent) => {
    try {
      // For a recurring instance, create a cancellation exception
      if (eventToDelete.isRecurringInstance) {
        if (!confirm("This is part of a series. Do you want to delete only this occurrence?")) return;
        await createEvent({
          recurrenceId: eventToDelete.masterId,
          originalStartTime: eventToDelete.startTime,
          isCancelled: true,
          // Provide required fields, even if not used for cancellation display
          title: eventToDelete.title || "Cancelled",
          startTime: eventToDelete.startTime,
          endTime: eventToDelete.endTime,
        });
        await loadEvents();
      } 
      // For a master recurring event
      else if (eventToDelete.rrule) {
        if (!confirm("This is a recurring event. Deleting it will remove all future occurrences. Are you sure?")) return;
        await deleteEvent(eventToDelete.id);
        await loadEvents();
      }
      // For a simple, non-recurring event or an exception
      else {
        if (!confirm("Are you sure you want to delete this event?")) return;
        await deleteEvent(eventToDelete.id);
        setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Failed to delete the event.");
    }
  };

  const days = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));
  const hours = Array.from({ length: 24 }).map((_, i) => i);

  return (
    <>
      <EventModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEventToEdit(null); }} 
        onSubmit={handleSaveEvent}
        initialDate={modalInitialDate}
        eventToEdit={eventToEdit}
      />
      <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* --- Top Navigation Bar --- */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shadow-sm z-30">
        <div className="flex items-center gap-4">
          <div className="bg-primary p-2 rounded-lg text-primary-foreground">
            <CalendarIcon size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Zenith Calendar</h1>
          <div className="flex items-center bg-background rounded-lg p-1 ml-6 border border-border">
            <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="p-1.5 hover:bg-card rounded transition-colors"><ChevronLeft size={20}/></button>
            <span className="px-4 font-semibold text-sm w-32 text-center">
              {format(startDate, 'MMM d')} - {format(addDays(startDate, 6), 'MMM d')}
            </span>
            <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-1.5 hover:bg-card rounded transition-colors"><ChevronRight size={20}/></button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => openAddModal(new Date())} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors">
            <Plus size={16} />
            Add Event
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* --- Error Toast --- */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 fixed top-24 right-8 shadow-lg rounded-lg z-50 flex items-center gap-3 animate-slide-in">
          <AlertCircle size={20}/>
          <p className="font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-4 font-bold">✕</button>
        </div>
      )}

      {/* --- Main Calendar Area --- */}
      <div className="flex-1 overflow-y-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 z-40 flex items-center justify-center">
            <LoaderCircle size={48} className="text-primary animate-spin" />
          </div>
        )}
        <div ref={gridRef} className="grid grid-cols-8 min-w-[1000px]">
          
          {/* Header Row (Sticky) */}
          <div className="col-span-8 grid grid-cols-8 sticky top-0 z-20 bg-card border-b border-border shadow-sm">
            <div className="p-4 text-xs font-semibold text-foreground/50 uppercase text-center pt-8">Time</div>
            {days.map((day, i) => (
              <div key={i} className={clsx(
                "p-4 text-center border-l border-border flex flex-col items-center justify-center py-6",
                isSameDay(day, new Date()) && "bg-primary/10"
              )}>
                <span className={clsx("text-xs font-bold uppercase mb-1", isSameDay(day, new Date()) ? "text-primary" : "text-foreground/60")}>
                  {format(day, 'EEE')}
                </span>
                <span className={clsx(
                  "text-xl h-10 w-10 flex items-center justify-center rounded-full font-medium", 
                  isSameDay(day, new Date()) ? "bg-primary text-primary-foreground shadow-md" : "text-foreground"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="col-span-8 grid grid-cols-8 relative bg-card">
            
            {/* Background Grid Lines & Time Labels */}
            {hours.map((hour) => (
              <React.Fragment key={hour}>
                {/* Time Column */}
                <div className="border-r border-border -mt-2.5 text-xs text-foreground/50 text-right pr-2 h-20">
                  {format(addHours(startOfDay(new Date()), hour), 'h a')}
                </div>
                {/* Day Columns (Empty Cells) */}
                {days.map((_, i) => (
                  <div key={`${hour}-${i}`} className="border-b border-r border-border h-20 hover:bg-background transition-colors" />
                ))}
              </React.Fragment>
            ))}

            {/* Events Overlay */}
            {events.map((event) => {
              const start = new Date(event.startTime);
              const end = new Date(event.endTime);
              
              // Only render if event is in current week view
              if (start < startDate || start > addDays(startDate, 7)) return null;

              const dayIndex = getDay(start) === 0 ? 7 : getDay(start); // Monday=1, Sunday=7
              const startHour = start.getHours() + start.getMinutes() / 60;
              const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

              const eventStyle = {
                top: `${startHour * 5}rem`,
                height: `${duration * 5}rem`,
                left: `${(dayIndex) * 12.5}%`,
                width: '12.5%',
              };

              const eventContent = (
                <div onClick={() => openEditModal(event)} className="p-2 rounded-lg border-l-4 text-xs shadow-md hover:shadow-lg transition-all cursor-grab group z-10 overflow-hidden bg-primary/10 border-primary h-full w-full">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-primary-dark dark:text-primary-light truncate">{event.title}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(event); }}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 bg-card/80 rounded-full shadow-sm"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="text-primary/80 mt-1 font-medium">
                      {format(start, 'h:mm')} - {format(end, 'h:mm a')}
                    </div>
                </div>
              );

              return (
                <DraggableEvent key={event.id} event={event} style={eventStyle}>
                  {eventContent}
                </DraggableEvent>
              );
            })}
            
            {/* Current Time Indicator Line (Optional Polish) */}
            {isSameDay(new Date(), currentDate) && (
              <div 
                className="absolute w-full border-t-2 border-red-500 z-20 pointer-events-none flex items-center"
                style={{ 
                  top: `${(new Date().getHours() + new Date().getMinutes()/60) * 5}rem`,
                  left: '12.5%' // Start after the time column
                }}
              >
                <div className="bg-red-500 rounded-full h-3 w-3 -ml-1.5"></div>
              </div>
            )}

          </div>
        </div>
        <DragOverlay>
            {activeEvent ? (
              <div className="p-2 rounded-lg border-l-4 text-xs shadow-lg z-50 overflow-hidden bg-primary/20 border-primary" style={{ height: `${(new Date(activeEvent.endTime).getTime() - new Date(activeEvent.startTime).getTime()) / (1000 * 60 * 60) * 5}rem`, width: `${gridRef.current ? gridRef.current.offsetWidth / 8 : 150}px`}}>
                <div className="font-bold text-primary-dark dark:text-primary-light truncate">{activeEvent.title}</div>
                <div className="text-primary/80 mt-1 font-medium">
                  {format(new Date(activeEvent.startTime), 'h:mm')} - {format(new Date(activeEvent.endTime), 'h:mm a')}
                </div>
              </div>
            ) : null}
          </DragOverlay>
      </div>
      </DndContext>
    </div>
    </>
  );
};
    
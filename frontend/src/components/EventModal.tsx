import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { RRule, RRuleSet, rrulestr } from 'rrule';
import type { CalendarEvent as EventType } from '../api';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<EventType> & { id?: string }) => Promise<void>;
  initialDate?: Date;
  eventToEdit?: EventType | null;
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSubmit, initialDate, eventToEdit }) => {
  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(initialDate || new Date(), 'yyyy-MM-dd'));
  const [selectedStartHour, setSelectedStartHour] = useState('09:00');
  const [selectedEndHour, setSelectedEndHour] = useState('10:00');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!eventToEdit && !eventToEdit.isRecurringInstance;

  // --- Recurrence State ---
  const [repeats, setRepeats] = useState(false);
  const [freq, setFreq] = useState(RRule.WEEKLY);
  const [interval, setInterval] = useState(1);
  const [byday, setByday] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Reset form state on open
      setError(null);
      const initial = eventToEdit || { startTime: initialDate || new Date() };
      const startDate = new Date(initial.startTime);

      setTitle(eventToEdit?.title || '');
      setSelectedDate(format(startDate, 'yyyy-MM-dd'));
      setSelectedStartHour(format(startDate, 'HH:mm'));
      setSelectedEndHour(eventToEdit ? format(new Date(eventToEdit.endTime), 'HH:mm') : '10:00');

      // Set recurrence form state
      if (eventToEdit?.rrule) {
        const rule = rrulestr(eventToEdit.rrule);
        setRepeats(true);
        setFreq(rule.options.freq);
        setInterval(rule.options.interval);
        setByday(rule.options.byday || []);
      } else {
        setRepeats(false);
        setFreq(RRule.WEEKLY);
        setInterval(1);
        setByday([startDate.getDay()]);
      }
    }
  }, [eventToEdit, initialDate, isOpen]);

  const handleWeekdayChange = (day: number) => {
    setByday(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const startDateTime = new Date(`${selectedDate}T${selectedStartHour}:00`);
      const endDateTime = new Date(`${selectedDate}T${selectedEndHour}:00`);
      
      if (startDateTime >= endDateTime) {
        setError('End time must be after start time.');
        setIsSubmitting(false);
        return;
      }

      let rruleString: string | undefined = undefined;
      if (repeats) {
        const ruleOptions: Partial<RRule.Options> = {
          freq,
          interval,
          dtstart: startDateTime,
        };

        // The 'byday' property is only valid for weekly recurrences in our UI.
        // Applying it to other frequencies was causing an error.
        if (freq === RRule.WEEKLY) {
          // For weekly repeats, rrule requires a day to repeat on.
          // If the user hasn't selected any, default to the day of the start date.
          // An empty byday array is not valid for weekly frequency.
          ruleOptions.byday = byday.length > 0 ? byday : [startDateTime.getDay()];
        }

        const rule = new RRule(ruleOptions);
        rruleString = rule.toString();
      }

      await onSubmit({ 
        id: isEditMode ? eventToEdit.id : undefined,
        title, 
        startTime: startDateTime.toISOString(), 
        endTime: endDateTime.toISOString(),
        rrule: rruleString,
      });
      onClose();
    } catch (err: any) {
      if (err.response && err.response.status === 409) {
        setError("Conflict detected! This slot is already booked.");
      } else {
        setError("Could not save event. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Cannot edit a single instance of a recurring event, only the master.
  // The logic in Calendar.tsx will create an exception instead.
  const modalTitle = eventToEdit?.isRecurringInstance 
    ? 'Editing an Instance' 
    : isEditMode ? 'Edit Event' : 'Add New Event';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card rounded-lg shadow-2xl w-full max-w-md p-6 relative animate-scale-in" role="dialog" aria-modal="true">
        <button onClick={onClose} className="absolute top-3 right-3 text-foreground/50 hover:text-foreground">
          <X size={24} />
        </button>
        <h2 className="text-xl font-bold mb-4 text-foreground">{modalTitle}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground/80 mb-1">Event Name</label>
            <input id="title" required placeholder="Team Meeting" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring outline-none" />
          </div>
          
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-foreground/80 mb-1">Date</label>
            <input id="date" required type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring outline-none" />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label htmlFor="start-time" className="block text-sm font-medium text-foreground/80 mb-1">Start Time</label>
              <input id="start-time" required type="time" value={selectedStartHour} onChange={e => setSelectedStartHour(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring outline-none" />
            </div>
            <div className="flex-1">
              <label htmlFor="end-time" className="block text-sm font-medium text-foreground/80 mb-1">End Time</label>
              <input id="end-time" required type="time" value={selectedEndHour} onChange={e => setSelectedEndHour(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring outline-none" />
            </div>
          </div>

          {/* --- Recurrence Section --- */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="repeats" checked={repeats} onChange={e => setRepeats(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <label htmlFor="repeats" className="text-sm font-medium">Repeats</label>
            </div>

            {repeats && (
              <div className="pl-6 space-y-4 border-l-2 border-border ml-2 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Every</span>
                  <input type="number" value={interval} onChange={e => setInterval(parseInt(e.target.value, 10) || 1)} min="1" className="w-16 bg-background border border-border rounded-md px-2 py-1 text-sm" />
                  <select value={freq} onChange={e => setFreq(Number(e.target.value))} className="bg-background border border-border rounded-md px-2 py-1 text-sm">
                    <option value={RRule.DAILY}>Day(s)</option>
                    <option value={RRule.WEEKLY}>Week(s)</option>
                    <option value={RRule.MONTHLY}>Month(s)</option>
                    <option value={RRule.YEARLY}>Year(s)</option>
                  </select>
                </div>
                {freq === RRule.WEEKLY && (
                  <div className="flex gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <button key={i} type="button" onClick={() => handleWeekdayChange(i)} className={`w-8 h-8 rounded-full text-xs font-bold ${byday.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-border hover:bg-border/80'}`}>
                        {day}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-md p-3 flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium bg-border hover:bg-border/80">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
      
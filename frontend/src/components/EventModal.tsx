import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, startTime: string, endTime: string) => Promise<void>;
  initialDate?: Date;
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSubmit, initialDate }) => {
  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(initialDate || new Date(), 'yyyy-MM-dd'));
  const [selectedStartHour, setSelectedStartHour] = useState('09:00');
  const [selectedEndHour, setSelectedEndHour] = useState('10:00');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(format(initialDate, 'yyyy-MM-dd'));
    }
  }, [initialDate, isOpen]);

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

      await onSubmit(title, startDateTime.toISOString(), endDateTime.toISOString());
      setTitle('');
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

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card rounded-lg shadow-2xl w-full max-w-md p-6 relative animate-scale-in" role="dialog" aria-modal="true">
        <button onClick={onClose} className="absolute top-3 right-3 text-foreground/50 hover:text-foreground">
          <X size={24} />
        </button>
        <h2 className="text-xl font-bold mb-4 text-foreground">Add New Event</h2>
        
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
              {isSubmitting ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
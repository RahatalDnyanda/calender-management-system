import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { rrulestr } from 'rrule';

const prisma = new PrismaClient();

// GET /events?start=ISO_DATE&end=ISO_DATE
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  const { start, end } = req.query;
  const windowStart = new Date(start as string);
  const windowEnd = new Date(end as string);

  try {
    // 1. Fetch all events that could possibly appear in the window.
    // This includes single events, master recurring events, and exceptions.
    const potentialEvents = await prisma.event.findMany({
      where: {
        OR: [
          // A. Regular, non-recurring events that overlap the window.
          {
            rrule: null,
            recurrenceId: null,
            startTime: { lt: windowEnd },
            endTime: { gt: windowStart },
          },
          // B. Master recurring events that start before the window ends.
          {
            rrule: { not: null },
            startTime: { lt: windowEnd },
          },
          // C. Exception events whose original time was in the window.
          {
            recurrenceId: { not: null },
            originalStartTime: {
              gte: windowStart,
              lt: windowEnd,
            },
          },
        ],
      },
    });

    const finalEvents: any[] = [];
    const exceptions = new Map<string, any>(); // Key: masterEventId-originalStartTimeISO

    // Separate master, exceptions, and single events
    const masterEvents = potentialEvents.filter(e => e.rrule);
    const singleEvents = potentialEvents.filter(e => !e.rrule && !e.recurrenceId);
    
    potentialEvents.filter(e => e.recurrenceId && e.originalStartTime).forEach(ex => {
        const key = `${ex.recurrenceId}-${ex.originalStartTime!.toISOString()}`;
        exceptions.set(key, ex);
    });

    // Add all non-recurring, non-exception events to the final list
    finalEvents.push(...singleEvents);

    // 2. Process recurring events and their exceptions
    for (const master of masterEvents) {
      // Use rrulestr to parse the rule. The master event's startTime is the DTSTART.
      const rule = rrulestr(master.rrule!, { dtstart: master.startTime });
      const occurrences = rule.between(windowStart, windowEnd);
      const duration = master.endTime.getTime() - master.startTime.getTime();

      for (const occurrenceDate of occurrences) {
        const key = `${master.id}-${occurrenceDate.toISOString()}`;

        // If there is an exception for this occurrence, handle it
        if (exceptions.has(key)) {
          const exceptionEvent = exceptions.get(key);
          // If the exception is a modified event (not just a cancellation), add it.
          if (!exceptionEvent.isCancelled) {
            finalEvents.push(exceptionEvent);
          }
          // If it is a cancellation, we do nothing, effectively deleting it from the series.
        } else {
          // No exception, so add the generated occurrence as a "virtual" event
          finalEvents.push({
            ...master,
            // Override key properties for this specific instance
            id: `${master.id}_${occurrenceDate.getTime()}`, // Create a unique virtual ID for React keys
            startTime: occurrenceDate,
            endTime: new Date(occurrenceDate.getTime() + duration),
            // Add flags for the frontend to identify this as a recurring instance
            isRecurringInstance: true,
            masterId: master.id,
          });
        }
      }
    }

    res.json(finalEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// POST /events
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  const { title, startTime, endTime, rrule, recurrenceId, originalStartTime, isCancelled } = req.body;
  
  // Convert strings to Date objects
  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);

  // 1. Basic Validation
  // Title is not required for a cancellation event, but other events need it.
  if (!isCancelled && (!title || typeof title !== 'string' || title.trim() === '')) {
    res.status(400).json({ error: 'Title is required and cannot be empty' });
    return;
  }
  // Time validation is also not needed for a cancellation marker.
  if (!isCancelled && newStart >= newEnd) {
    res.status(400).json({ error: 'End time must be after start time' });
    return;
  }

  try {
    // 2. Conflict Detection
    // Note: This simple conflict detection doesn't account for recurring event series.
    // A production system would need to check for conflicts against generated occurrences.
    // For this assignment, we'll keep it simple.
    const conflictingEvent = await prisma.event.findFirst({
      where: {
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
        // We should also exclude the master event if we are creating an exception for it
        id: recurrenceId ? { not: recurrenceId } : undefined,
      },
    });

    if (conflictingEvent) {
       res.status(409).json({
        error: 'This time slot overlaps with an existing event.',
        conflict: conflictingEvent 
      });
      return;
    }

    // 3. Save if clear
    const event = await prisma.event.create({
      data: {
        // Ensure title is at least an empty string if it's a cancellation and title is missing
        title: title || '',
        startTime: newStart,
        endTime: newEnd,
        rrule,
        recurrenceId,
        originalStartTime: originalStartTime ? new Date(originalStartTime) : undefined,
        isCancelled: isCancelled || false,
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

// PUT /events/:id
export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, startTime, endTime, rrule } = req.body;

  // Convert strings to Date objects
  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);

  // 1. Basic Validation
  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ error: 'Title is required and cannot be empty' });
    return;
  }
  if (newStart >= newEnd) {
    res.status(400).json({ error: 'End time must be after start time' });
    return;
  }

  try {
    // 2. Conflict Detection (excluding the current event)
    const conflictingEvent = await prisma.event.findFirst({
      where: {
        id: { not: id }, // Exclude the event being updated
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    });

    if (conflictingEvent) {
      res.status(409).json({
        error: 'This time slot overlaps with another event.',
        conflict: conflictingEvent,
      });
      return;
    }

    // 3. Update the event
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { title, startTime: newStart, endTime: newEnd, rrule },
    });

    res.json(updatedEvent);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update event' });
  }
};

// DELETE /events/:id
export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        // Check if this is a master recurring event
        const event = await prisma.event.findUnique({ where: { id } });

        if (event && event.rrule) {
            // It's a master event, delete it and all its exceptions in a transaction
            await prisma.$transaction([
                // 1. Delete all exception events linked to this master event
                prisma.event.deleteMany({ where: { recurrenceId: id } }),
                // 2. Delete the master event itself
                prisma.event.delete({ where: { id } })
            ]);
        } else {
            // It's a single event or an exception, just delete it
            await prisma.event.delete({ where: { id } });
        }
        res.status(204).send();
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // This can happen if the event was already deleted
            res.status(404).json({ error: 'Event not found' });
            return;
        }
        res.status(500).json({ error: "Failed to delete event" });
    }
}
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /events?start=ISO_DATE&end=ISO_DATE
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  const { start, end } = req.query;

  try {
    const events = await prisma.event.findMany({
      where: {
        startTime: {
          gte: new Date(start as string), // Filter events starting after window start
        },
        endTime: {
          lte: new Date(end as string),   // Filter events ending before window end
        },
      },
      orderBy: { startTime: 'asc' },
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// POST /events
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  const { title, startTime, endTime } = req.body;
  
  // Convert strings to Date objects
  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);

  // 1. Basic Validation
  if (newStart >= newEnd) {
    res.status(400).json({ error: 'End time must be after start time' });
    return;
  }

  try {
    // 2. Conflict Detection (The "Trap" Logic)
    // We search for ANY event that overlaps.
    // Logic: (ExistingStart < NewEnd) AND (ExistingEnd > NewStart)
    const conflictingEvent = await prisma.event.findFirst({
      where: {
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
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
        title,
        startTime: newStart,
        endTime: newEnd,
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

// DELETE /events/:id
export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        await prisma.event.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: "Failed to delete event" });
    }
}
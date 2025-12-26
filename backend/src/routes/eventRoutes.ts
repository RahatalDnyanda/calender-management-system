import { Router } from 'express';
import { getEvents, createEvent, deleteEvent } from '../controllers/eventController';

const router = Router();

router.get('/', getEvents);
router.post('/', createEvent);
router.delete('/:id', deleteEvent);

export default router;
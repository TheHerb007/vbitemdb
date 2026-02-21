import { Router, Request, Response } from 'express';
import { introspectSchema } from '../services/introspection';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const force = req.query.refresh === 'true';
    const tables = await introspectSchema(force);
    res.json({ tables });
  } catch (err) {
    console.error('Schema introspection error:', err);
    res.status(500).json({ error: 'Failed to introspect schema' });
  }
});

export default router;

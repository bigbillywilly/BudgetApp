// Replace your entire auth.routes.ts with this:
import { Router } from 'express';

const router = Router();

router.get('/test', (req, res) => {
  res.json({ message: 'test works' });
});

export { router as authRoutes };
import 'dotenv/config';

import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  claimInitialAdminPassword,
  getAdminAuthStatus,
  issueAdminToken,
  requireAdminAuth,
  verifyAdminCredentials,
} from './server/auth.ts';
import {
  ComplaintStatus,
  createComplaint,
  deleteComplaintById,
  getDashboardStats,
  initDatabase,
  listComplaints,
  updateComplaintStatus,
} from './server/db.ts';
import { mlClassifier } from './server/ml/classifier.ts';
import { ISSUE_CATEGORIES, IssueCategory } from './server/ml/trainingData.ts';

async function startServer() {
  await initDatabase();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'campus-issue-reporting-system' });
  });

  app.get('/api/categories', (_req, res) => {
    res.json({ categories: ISSUE_CATEGORIES });
  });

  app.post('/api/predict-category', (req, res) => {
    const rawDescription = req.body?.description;
    if (typeof rawDescription !== 'string') {
      res.status(400).json({ error: 'Description must be a text string.' });
      return;
    }

    const description = rawDescription.trim();
    if (description.length < 3) {
      res.status(400).json({ error: 'Please enter at least 3 characters for category suggestion.' });
      return;
    }
    if (description.length > 2000) {
      res.status(400).json({ error: 'Description must not exceed 2000 characters.' });
      return;
    }

    const prediction = mlClassifier.predict(description);
    res.json(prediction);
  });

  app.post('/api/complaints', async (req, res) => {
    try {
      const { studentName, studentId, category, location, description } = req.body ?? {};

      if (
        typeof studentName !== 'string' ||
        typeof studentId !== 'string' ||
        typeof category !== 'string' ||
        typeof location !== 'string' ||
        typeof description !== 'string'
      ) {
        res.status(400).json({ error: 'All required fields must be valid text values.' });
        return;
      }

      const cleanName = studentName.trim();
      const cleanStudentId = studentId.trim().toUpperCase();
      const cleanCategory = category.trim();
      const cleanLocation = location.trim();
      const cleanDescription = description.trim();

      if (cleanName.length < 2 || cleanName.length > 100) {
        res.status(400).json({ error: 'Student name must be between 2 and 100 characters.' });
        return;
      }

      if (!/^[A-Z0-9_-]{4,32}$/.test(cleanStudentId)) {
        res.status(400).json({
          error: 'Student ID must be 4–32 alphanumeric characters (letters, numbers, - or _).',
        });
        return;
      }

      if (!ISSUE_CATEGORIES.includes(cleanCategory as IssueCategory)) {
        res.status(400).json({ error: 'Please select a valid issue category.' });
        return;
      }

      if (cleanLocation.length < 3 || cleanLocation.length > 150) {
        res.status(400).json({ error: 'Location must be between 3 and 150 characters.' });
        return;
      }

      if (cleanDescription.length < 10 || cleanDescription.length > 2000) {
        res.status(400).json({ error: 'Description must be between 10 and 2000 characters.' });
        return;
      }

      const record = await createComplaint({
        studentName: cleanName,
        studentId: cleanStudentId,
        category: cleanCategory as IssueCategory,
        location: cleanLocation,
        description: cleanDescription,
      });

      res.status(201).json({ complaint: record });
    } catch (err) {
      console.error('Create complaint error:', err);
      res.status(500).json({ error: 'Database error while saving complaint.' });
    }
  });

  app.get('/api/admin/status', async (_req, res) => {
    try {
      res.json(await getAdminAuthStatus());
    } catch (err) {
      console.error('Admin status error:', err);
      res.status(500).json({ error: 'Failed to check admin status.' });
    }
  });

  app.post('/api/admin/claim', async (req, res) => {
    try {
      const status = await getAdminAuthStatus();
      if (!status.needsSetup) {
        res.status(409).json({ error: 'Administrator password has already been configured.' });
        return;
      }

      const rawPassword = req.body?.password;
      if (typeof rawPassword !== 'string' || rawPassword.trim().length < 6 || rawPassword.length > 128) {
        res.status(400).json({ error: 'Administrator password must be at least 6 characters.' });
        return;
      }

      const claimed = await claimInitialAdminPassword(rawPassword.trim());
      if (!claimed) {
        res.status(409).json({ error: 'Administrator password was already claimed.' });
        return;
      }

      const token = issueAdminToken();
      res.status(201).json({ token });
    } catch (err) {
      console.error('Admin claim error:', err);
      res.status(500).json({ error: 'Database error while saving admin password.' });
    }
  });

  app.post('/api/admin/login', async (req, res) => {
    try {
      const status = await getAdminAuthStatus();
      if (status.needsSetup) {
        res.status(400).json({ error: 'Please set up the administrator password first.' });
        return;
      }

      const rawPassword = req.body?.password;
      if (typeof rawPassword !== 'string' || rawPassword.length === 0 || rawPassword.length > 128) {
        res.status(400).json({ error: 'Password is required.' });
        return;
      }

      if (!(await verifyAdminCredentials(rawPassword.trim()))) {
        res.status(401).json({ error: 'Invalid administrator credentials.' });
        return;
      }

      const token = issueAdminToken();
      res.json({ token });
    } catch (err) {
      console.error('Admin login error:', err);
      res.status(500).json({ error: 'Database error during login.' });
    }
  });

  app.get('/api/admin/verify', requireAdminAuth, (_req, res) => {
    res.json({ valid: true });
  });

  app.get('/api/complaints', requireAdminAuth, async (req, res) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const complaints = await listComplaints({ status, category, search });
      res.json({ complaints });
    } catch (err) {
      console.error('List complaints error:', err);
      res.status(500).json({ error: 'Database error while fetching complaints.' });
    }
  });

  app.get('/api/stats', requireAdminAuth, async (_req, res) => {
    try {
      const stats = await getDashboardStats();
      res.json(stats);
    } catch (err) {
      console.error('Stats error:', err);
      res.status(500).json({ error: 'Database error while calculating statistics.' });
    }
  });

  app.patch('/api/complaints/:id', requireAdminAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Invalid complaint ID.' });
        return;
      }

      const nextStatus = req.body?.status;
      if (nextStatus !== 'Pending' && nextStatus !== 'Resolved') {
        res.status(400).json({ error: 'Status must be Pending or Resolved.' });
        return;
      }

      const updated = await updateComplaintStatus(id, nextStatus as ComplaintStatus);
      if (!updated) {
        res.status(404).json({ error: 'Complaint record not found.' });
        return;
      }

      res.json({ complaint: updated });
    } catch (err) {
      console.error('Update status error:', err);
      res.status(500).json({ error: 'Database error while updating status.' });
    }
  });

  app.delete('/api/complaints/:id', requireAdminAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Invalid complaint ID.' });
        return;
      }

      const deleted = await deleteComplaintById(id);
      if (!deleted) {
        res.status(404).json({ error: 'Complaint record not found.' });
        return;
      }

      res.json({ deleted: true, id });
    } catch (err) {
      console.error('Delete complaint error:', err);
      res.status(500).json({ error: 'Database error while deleting complaint.' });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Campus Issue Reporting System running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
import express from 'express';
const app = express();
app.get('/', (req, res) => {
  res.json({ status: req.query.status, type: typeof req.query.status, isArray: Array.isArray(req.query.status) });
});
const server = app.listen(3100, async () => {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('http://localhost:3100/?status=WAITING_TRIAGE&status=IN_TRIAGE');
  console.log(await res.json());
  server.close();
});

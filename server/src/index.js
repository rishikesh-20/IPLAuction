require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const routes = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');
const initSocket = require('./socket/index');

const app = express();
const server = http.createServer(app);

// Connect DB
connectDB();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api', routes);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
app.use(errorHandler);

// Socket.io
initSocket(server);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'))
  );
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

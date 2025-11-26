const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/auth', require('./routes/auth'));


// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice_generator', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Basic route
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Invoice Generator API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      invoices: '/api/invoices',
      health: '/api/health'
    }
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    data: {
      test: 'This is a test response',
      timestamp: new Date().toISOString()
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'API route not found',
    path: req.originalUrl 
  });
});

// 404 handler for all other routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    path: req.originalUrl 
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test route: http://localhost:${PORT}/api/test`);
});
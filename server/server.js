
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');
const auth = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const facilitatorRoutes = require('./routes/facilitatorRoutes');
const studentRoutes = require('./routes/studentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const forumRoutes = require('./routes/forumRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminServices = require('./services/adminServices');
const webpush = require('web-push');
const { clg } = require('./routes/basics');
const { apiLimiter, authLimiter, uploadLimiter } = require('./middleware/rateLimiter');
const { errorConverter, errorHandler, notFound } = require('./middleware/errorHandler');

// Configure the environment
require('dotenv').config();

// Create Express application
const app = express();
const PORT = process.env.PORT || 8080;

// CORS Configuration - Security Fix
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL || 'https://yourdomain.com']
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));

// Configure Web Push
if (process.env.PUBLIC_VAPID_KEY && process.env.PRIVATE_VAPID_KEY) {
  webpush.setVapidDetails(
    'mailto:test@example.com',
    process.env.PUBLIC_VAPID_KEY,
    process.env.PRIVATE_VAPID_KEY
  );
  app.set('webpush', webpush);
  console.log('Web Push configured successfully');
} else {
  console.warn('Web Push not configured. Missing VAPID keys.');
}

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms';
const client = new MongoClient(mongoURI);

async function startServer() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    // Make the database accessible to our routes
    app.locals.db = client.db();
    
    // Initialize API documentation
    await adminServices.initializeDefaultDocumentation(app.locals.db);
    
    // Apply rate limiting
    app.use('/api/', apiLimiter);
    
    // API Routes
    app.use('/api/auth', authLimiter, authRoutes);
    app.use('/api/admin', adminRoutes); 
    app.use('/api/facilitator', facilitatorRoutes);
    app.use('/api/learner', studentRoutes);
    app.use('/api/courses', courseRoutes);
    app.use('/api/forum', forumRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/upload', uploadLimiter, uploadRoutes);
    app.use('/api/contact', contactRoutes);
    
    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(path.join(__dirname, '../build')));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../build', 'index.html'));
      });
    }
    
    // 404 handler
    app.use(notFound);
    
    // Error handling middleware (must be last)
    app.use(errorConverter);
    app.use(errorHandler);
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer().catch(console.error);

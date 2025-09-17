const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');

// Import routers
const pairRouter = require('./pair');
const qrRouter = require('./qr');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Create necessary directories
const ensureDirectories = async () => {
  const directories = ['sessions', 'public', 'logs', 'temp'];
  
  for (const dir of directories) {
    try {
      await fs.ensureDir(dir);
      console.log(`? Directory created/verified: ${dir}`);
    } catch (error) {
      console.error(`? Error creating directory ${dir}:`, error);
    }
  }
};

// Routes
app.use('/pair', pairRouter);
app.use('/qr', qrRouter);

// Serve main pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

app.get('/pair-page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pair.html'));
});

app.get('/qr-page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qr.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'SILATRIX-MD Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Server status endpoint
app.get('/status', async (req, res) => {
  try {
    const sessionsDir = path.join(__dirname, 'sessions');
    let activeSessions = 0;
    
    if (await fs.pathExists(sessionsDir)) {
      const files = await fs.readdir(sessionsDir);
      activeSessions = files.length;
    }
    
    res.json({
      status: 'operational',
      activeSessions: activeSessions,
      serverTime: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'SILATRIX-MD API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      status: '/status',
      pair: {
        generate: 'POST /pair',
        status: 'GET /pair/status/:id'
      },
      qr: {
        generate: 'GET /qr/generate',
        status: 'GET /qr/status/:id',
        cleanup: 'POST /qr/cleanup'
      }
    },
    documentation: 'https://github.com/silatrix2/silatrix-md'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('?? Server Error:', error);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    requestedUrl: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n?? Received SIGINT. Shutting down gracefully...');
  
  try {
    // Cleanup tasks here if needed
    console.log('? Cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('? Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n?? Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    await ensureDirectories();
    
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log('?? SILATRIX-MD Server Started');
      console.log('='.repeat(50));
      console.log(`?? Port: ${PORT}`);
      console.log(`?? URL: http://localhost:${PORT}`);
      console.log(`?? Health: http://localhost:${PORT}/health`);
      console.log(`?? Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('?? Sila Tech Automation Ecosystem');
      console.log('?? Channel: https://whatsapp.com/channel/0029Vb6DeKwCHDygxt0RXh0L');
      console.log('='.repeat(50));
      
      // Initial cleanup of old sessions
      setTimeout(async () => {
        try {
          const sessionsDir = path.join(__dirname, 'sessions');
          if (await fs.pathExists(sessionsDir)) {
            const sessions = await fs.readdir(sessionsDir);
            console.log(`?? Found ${sessions.length} sessions to clean up`);
          }
        } catch (cleanupError) {
          console.log('Initial cleanup skipped');
        }
      }, 2000);
    });
    
  } catch (error) {
    console.error('? Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('?? Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('?? Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();

module.exports = app;
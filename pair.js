const express = require('express');
const { makeWASocket, useMultiFileAuthState, Browsers, delay } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Session storage
const SESSIONS_DIR = './sessions';

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Generate random session ID
function generateSessionId() {
    return 'SILA_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Clean up session files
function cleanupSession(sessionPath) {
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }
}

// Pairing endpoint
app.post('/pair', async (req, res) => {
    const { number } = req.body;
    
    if (!number) {
        return res.json({ success: false, message: 'Phone number is required' });
    }

    const cleanNumber = number.replace(/[^0-9]/g, '');
    
    if (cleanNumber.length < 8) {
        return res.json({ success: false, message: 'Invalid phone number format' });
    }

    const sessionId = generateSessionId();
    const sessionPath = path.join(SESSIONS_DIR, sessionId);

    try {
        // Create session directory
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.macOS("Safari"),
            syncFullHistory: false
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection } = update;

            if (connection === 'open') {
                console.log(`✅ Session ${sessionId} connected successfully`);
                
                // Send welcome message
                await delay(1500);
                try {
                    await sock.sendMessage(sock.user.id, {
                        text: `🚀 *SILATRIX-MD Activated*\n\n` +
                              `✅ Your WhatsApp is now connected!\n` +
                              `📱 Session: ${sessionId}\n` +
                              `⏰ Connected: ${new Date().toLocaleString()}\n\n` +
                              `*Sila Tech Automation Ecosystem*\n` +
                              `Join our channel for updates!`
                    });
                } catch (msgError) {
                    console.log('Welcome message not sent');
                }

                // Close connection
                await delay(2000);
                try {
                    await sock.ws.close();
                } catch (closeError) {
                    console.log('Connection close error:', closeError);
                }
                
                // Clean up session files
                setTimeout(() => cleanupSession(sessionPath), 5000);
            }

            if (connection === 'close') {
                console.log(`❌ Session ${sessionId} connection closed`);
                cleanupSession(sessionPath);
            }
        });

        // Generate pairing code
        try {
            const pairingCode = await sock.requestPairingCode(cleanNumber);
            
            console.log(`📱 Pairing code generated for ${cleanNumber}: ${pairingCode}`);
            
            res.json({
                success: true,
                code: pairingCode,
                sessionId: sessionId,
                message: 'Pairing code generated successfully'
            });

        } catch (pairError) {
            console.error('Pairing error:', pairError);
            cleanupSession(sessionPath);
            res.json({
                success: false,
                message: 'Failed to generate pairing code. Please try again.'
            });
        }

    } catch (error) {
        console.error('Session error:', error);
        cleanupSession(sessionPath);
        res.json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pair.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'SILATRIX-MD Pairing Server',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SILATRIX-MD Pairing Server running on port ${PORT}`);
    console.log(`📱 Sila Tech Channel: https://whatsapp.com/channel/0029Vb6DeKwCHDygxt0RXh0L`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});
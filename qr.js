const express = require('express');
const { makeWASocket, useMultiFileAuthState, Browsers, delay } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const router = express.Router();
const SESSIONS_DIR = './sessions';

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Generate random session ID
function generateSessionId() {
    return 'QR_SILA_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Clean up session files
function cleanupSession(sessionPath) {
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }
}

// QR generation endpoint
router.get('/generate', async (req, res) => {
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

        let qrGenerated = false;

        sock.ev.on('connection.update', async (update) => {
            const { connection, qr } = update;

            // Send QR code to client
            if (qr && !qrGenerated) {
                qrGenerated = true;
                
                res.json({
                    success: true,
                    qr: qr,
                    sessionId: sessionId,
                    message: 'QR code generated successfully'
                });

                console.log(`📱 QR code generated for session: ${sessionId}`);
            }

            // Connection established
            if (connection === 'open') {
                console.log(`✅ Session ${sessionId} connected successfully`);
                
                // Send welcome message
                await delay(1500);
                try {
                    await sock.sendMessage(sock.user.id, {
                        text: `🚀 *SILATRIX-MD QR Activated*\n\n` +
                              `✅ Your WhatsApp is now connected via QR!\n` +
                              `📱 Session: ${sessionId}\n` +
                              `⏰ Connected: ${new Date().toLocaleString()}\n\n` +
                              `*Sila Tech Automation Ecosystem*\n` +
                              `Stay tuned for updates!`
                    });
                } catch (msgError) {
                    console.log('Welcome message not sent');
                }

                // Save session info
                const sessionInfo = {
                    sessionId: sessionId,
                    user: sock.user,
                    timestamp: new Date().toISOString(),
                    connectionType: 'QR'
                };

                fs.writeFileSync(
                    path.join(sessionPath, 'session-info.json'),
                    JSON.stringify(sessionInfo, null, 2)
                );

                // Keep connection open for 10 seconds then close
                setTimeout(async () => {
                    try {
                        await sock.ws.close();
                        console.log(`🔒 Session ${sessionId} closed gracefully`);
                    } catch (closeError) {
                        console.log('Connection close error:', closeError);
                    }
                }, 10000);
            }

            // Handle connection closure
            if (connection === 'close') {
                console.log(`❌ Session ${sessionId} connection closed`);
                // Don't cleanup immediately - wait for potential reconnection
                setTimeout(() => cleanupSession(sessionPath), 30000);
            }
        });

        // Timeout for QR generation
        setTimeout(() => {
            if (!qrGenerated) {
                cleanupSession(sessionPath);
                if (!res.headersSent) {
                    res.json({
                        success: false,
                        message: 'QR generation timeout. Please try again.'
                    });
                }
            }
        }, 30000);

    } catch (error) {
        console.error('QR generation error:', error);
        cleanupSession(sessionPath);
        
        if (!res.headersSent) {
            res.json({
                success: false,
                message: 'Internal server error. Please try again.'
            });
        }
    }
});

// Session status endpoint
router.get('/status/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId;
    const sessionPath = path.join(SESSIONS_DIR, sessionId);

    try {
        if (!fs.existsSync(sessionPath)) {
            return res.json({ exists: false, active: false });
        }

        const infoPath = path.join(sessionPath, 'session-info.json');
        if (fs.existsSync(infoPath)) {
            const sessionInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
            return res.json({ exists: true, active: true, info: sessionInfo });
        }

        res.json({ exists: true, active: false });

    } catch (error) {
        res.json({ exists: false, active: false, error: error.message });
    }
});

// Cleanup old sessions endpoint
router.post('/cleanup', async (req, res) => {
    try {
        const sessions = fs.readdirSync(SESSIONS_DIR);
        let cleaned = 0;

        for (const session of sessions) {
            const sessionPath = path.join(SESSIONS_DIR, session);
            const sessionAge = Date.now() - fs.statSync(sessionPath).mtimeMs;
            
            // Clean up sessions older than 1 hour
            if (sessionAge > 3600000) {
                cleanupSession(sessionPath);
                cleaned++;
            }
        }

        res.json({ success: true, cleaned: cleaned, message: `Cleaned ${cleaned} old sessions` });

    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

module.exports = router;
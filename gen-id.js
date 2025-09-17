/**
 * SILATRIX-MD Session ID Generator
 * Sila Tech Utilities
 */

class IDGenerator {
    constructor() {
        this.prefix = 'SILA';
        this.version = 'V1';
        this.seq = 0;
        this.lastTimestamp = 0;
    }

    /**
     * Generate a unique session ID
     * Format: SILA_V1_TIMESTAMP_RANDOM_SEQUENCE
     */
    generateSessionID(length = 16) {
        const timestamp = Date.now();
        const randomStr = this.generateRandomString(8);
        
        // Reset sequence if timestamp changes
        if (timestamp !== this.lastTimestamp) {
            this.seq = 0;
            this.lastTimestamp = timestamp;
        }
        
        this.seq = (this.seq + 1) % 1000;
        
        return `${this.prefix}_${this.version}_${timestamp}_${randomStr}_${this.seq.toString().padStart(3, '0')}`;
    }

    /**
     * Generate a short ID for temporary use
     */
    generateShortID(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }

    /**
     * Generate a random string with specified length
     */
    generateRandomString(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const crypto = require('crypto');
        const randomBytes = crypto.randomBytes(length);
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars[randomBytes[i] % chars.length];
        }
        
        return result;
    }

    /**
     * Generate a numeric code (for pairing codes)
     */
    generateNumericCode(length = 6) {
        const crypto = require('crypto');
        const randomBytes = crypto.randomBytes(length);
        let code = '';
        
        for (let i = 0; i < length; i++) {
            code += (randomBytes[i] % 10).toString();
        }
        
        return code;
    }

    /**
     * Generate a secure token for authentication
     */
    generateSecureToken(length = 32) {
        const crypto = require('crypto');
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Generate a batch of IDs (3 by 3 as requested)
     */
    generateBatch(count = 3) {
        const batch = [];
        for (let i = 0; i < count; i++) {
            batch.push(this.generateSessionID());
        }
        return batch;
    }

    /**
     * Validate session ID format
     */
    validateSessionID(sessionId) {
        const pattern = /^SILA_V1_\d+_[A-Za-z0-9]{8}_\d{3}$/;
        return pattern.test(sessionId);
    }

    /**
     * Extract timestamp from session ID
     */
    getTimestampFromID(sessionId) {
        if (!this.validateSessionID(sessionId)) {
            return null;
        }
        
        const parts = sessionId.split('_');
        return parseInt(parts[2]);
    }

    /**
     * Check if session ID is expired
     */
    isSessionExpired(sessionId, timeoutMs = 1800000) {
        const timestamp = this.getTimestampFromID(sessionId);
        if (!timestamp) return true;
        
        return (Date.now() - timestamp) > timeoutMs;
    }
}

// Singleton instance
const idGenerator = new IDGenerator();

// Utility functions for backward compatibility
function makeid(length = 12) {
    return idGenerator.generateRandomString(length);
}

function generateBatchIDs(count = 3) {
    return idGenerator.generateBatch(count);
}

// Export both the class and utility functions
module.exports = {
    IDGenerator,
    makeid,
    generateBatchIDs,
    idGenerator // Singleton instance
};
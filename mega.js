/**
 * SILATRIX-MD MEGA.nz Storage Integration
 * Sila Tech Cloud Storage Module
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class MEGAStorage {
    constructor() {
        this.initialized = false;
        this.storagePath = './mega-storage';
        this.configFile = path.join(this.storagePath, 'config.json');
        this.ensureStorageDirectory();
    }

    /**
     * Ensure storage directory exists
     */
    ensureStorageDirectory() {
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
        
        if (!fs.existsSync(this.configFile)) {
            this.saveConfig({
                enabled: false,
                email: '',
                password: '',
                lastSync: null,
                totalFiles: 0
            });
        }
        
        this.initialized = true;
    }

    /**
     * Load configuration
     */
    loadConfig() {
        try {
            const configData = fs.readFileSync(this.configFile, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            return {
                enabled: false,
                email: '',
                password: '',
                lastSync: null,
                totalFiles: 0
            };
        }
    }

    /**
     * Save configuration
     */
    saveConfig(config) {
        try {
            fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving config:', error);
            return false;
        }
    }

    /**
     * Initialize MEGA storage with credentials
     */
    initialize(email, password) {
        const config = this.loadConfig();
        config.enabled = true;
        config.email = email;
        config.password = this.encryptPassword(password);
        config.lastSync = new Date().toISOString();
        
        const success = this.saveConfig(config);
        
        if (success) {
            console.log('? MEGA storage initialized successfully');
            return true;
        } else {
            console.log('? Failed to initialize MEGA storage');
            return false;
        }
    }

    /**
     * Encrypt password (basic encryption for demo)
     */
    encryptPassword(password) {
        const algorithm = 'aes-256-ctr';
        const secretKey = 'silatrix-md-silatrix2-secret';
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
        const encrypted = Buffer.concat([cipher.update(password), cipher.final()]);
        
        return {
            iv: iv.toString('hex'),
            content: encrypted.toString('hex')
        };
    }

    /**
     * Decrypt password
     */
    decryptPassword(encryptedData) {
        try {
            const algorithm = 'aes-256-ctr';
            const secretKey = 'silatrix-md-silatrix2-secret';
            
            const decipher = crypto.createDecipheriv(
                algorithm, 
                secretKey, 
                Buffer.from(encryptedData.iv, 'hex')
            );
            
            const decrypted = Buffer.concat([
                decipher.update(Buffer.from(encryptedData.content, 'hex')),
                decipher.final()
            ]);
            
            return decrypted.toString();
        } catch (error) {
            console.error('Password decryption failed:', error);
            return null;
        }
    }

    /**
     * Upload file to MEGA (simulated)
     */
    async upload(fileStream, filename) {
        if (!this.initialized) {
            throw new Error('MEGA storage not initialized');
        }

        const config = this.loadConfig();
        if (!config.enabled) {
            throw new Error('MEGA storage is disabled');
        }

        try {
            // Simulate upload process
            console.log(`?? Uploading ${filename} to MEGA...`);
            
            // Create unique file ID
            const fileId = this.generateFileId(filename);
            const localPath = path.join(this.storagePath, fileId);
            
            // Save file locally (simulating MEGA upload)
            return new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(localPath);
                
                fileStream.pipe(writeStream);
                
                writeStream.on('finish', () => {
                    // Update config
                    config.totalFiles += 1;
                    config.lastSync = new Date().toISOString();
                    this.saveConfig(config);
                    
                    // Simulate MEGA URL
                    const megaUrl = `https://mega.nz/file/${fileId}`;
                    console.log(`? Upload completed: ${megaUrl}`);
                    
                    resolve(megaUrl);
                });
                
                writeStream.on('error', (error) => {
                    reject(new Error(`Upload failed: ${error.message}`));
                });
            });
            
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    /**
     * Download file from MEGA (simulated)
     */
    async download(fileId) {
        if (!this.initialized) {
            throw new Error('MEGA storage not initialized');
        }

        const config = this.loadConfig();
        if (!config.enabled) {
            throw new Error('MEGA storage is disabled');
        }

        try {
            const localPath = path.join(this.storagePath, fileId);
            
            if (!fs.existsSync(localPath)) {
                throw new Error('File not found');
            }
            
            console.log(`?? Downloading ${fileId} from MEGA...`);
            return fs.createReadStream(localPath);
            
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }

    /**
     * Generate unique file ID
     */
    generateFileId(filename) {
        const timestamp = Date.now();
        const randomStr = crypto.randomBytes(8).toString('hex');
        const hash = crypto.createHash('md5').update(filename).digest('hex');
        
        return `SILA_${timestamp}_${hash}_${randomStr}`;
    }

    /**
     * Get storage statistics
     */
    getStats() {
        const config = this.loadConfig();
        
        try {
            let totalSize = 0;
            let fileCount = 0;
            
            if (fs.existsSync(this.storagePath)) {
                const files = fs.readdirSync(this.storagePath);
                fileCount = files.length - 1; // Exclude config file
                
                files.forEach(file => {
                    if (file !== 'config.json') {
                        const filePath = path.join(this.storagePath, file);
                        const stats = fs.statSync(filePath);
                        totalSize += stats.size;
                    }
                });
            }
            
            return {
                enabled: config.enabled,
                totalFiles: fileCount,
                totalSize: this.formatFileSize(totalSize),
                lastSync: config.lastSync,
                email: config.email ? `${config.email.substring(0, 3)}***@***.com` : 'Not set'
            };
            
        } catch (error) {
            return {
                enabled: false,
                totalFiles: 0,
                totalSize: '0 B',
                lastSync: null,
                email: 'Error'
            };
        }
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Clean up storage
     */
    cleanup() {
        try {
            if (fs.existsSync(this.storagePath)) {
                const files = fs.readdirSync(this.storagePath);
                
                files.forEach(file => {
                    if (file !== 'config.json') {
                        const filePath = path.join(this.storagePath, file);
                        fs.unlinkSync(filePath);
                    }
                });
                
                console.log('? MEGA storage cleaned up');
                return true;
            }
        } catch (error) {
            console.error('Cleanup error:', error);
            return false;
        }
    }

    /**
     * Disable MEGA storage
     */
    disable() {
        const config = this.loadConfig();
        config.enabled = false;
        return this.saveConfig(config);
    }

    /**
     * Get MEGA storage status
     */
    getStatus() {
        const config = this.loadConfig();
        return {
            initialized: this.initialized,
            enabled: config.enabled,
            configured: !!config.email,
            lastSync: config.lastSync
        };
    }
}

// Create singleton instance
const megaStorage = new MEGAStorage();

// Export for use in other files
module.exports = {
    MEGAStorage,
    megaStorage,
    
    // Utility functions
    uploadFile: async (fileStream, filename) => {
        return await megaStorage.upload(fileStream, filename);
    },
    
    downloadFile: async (fileId) => {
        return await megaStorage.download(fileId);
    },
    
    getStorageStats: () => {
        return megaStorage.getStats();
    },
    
    initializeStorage: (email, password) => {
        return megaStorage.initialize(email, password);
    },
    
    cleanupStorage: () => {
        return megaStorage.cleanup();
    }
};
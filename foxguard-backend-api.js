const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

class FoxGuardAPI {
    constructor() {
        this.app = express();
        
        // Middleware
        this.app.use(cors());
        this.app.use(express.json());

        // Database connection
        this.pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: 'foxguard_anticheat'
        });

        // WebSocket for real-time updates
        this.wss = new WebSocket.Server({ port: 8080 });
        this.setupWebSocketHandlers();

        this.setupRoutes();
        this.startServer();
    }

    // Authentication Middleware
    authenticateJWT(req, res, next) {
        const authHeader = req.headers.authorization;

        if (authHeader) {
            const token = authHeader.split(' ')[1];

            jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
                if (err) {
                    return res.sendStatus(403);
                }

                req.user = user;
                next();
            });
        } else {
            res.sendStatus(401);
        }
    }

    setupWebSocketHandlers() {
        this.wss.on('connection', (ws) => {
            console.log('Client connected to WebSocket');

            // Real-time violation streaming
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    
                    if (data.type === 'REGISTER_SERVER') {
                        // Register server for real-time monitoring
                        await this.registerServerForMonitoring(data.serverId, data.serverKey);
                    }
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            });
        });
    }

    setupRoutes() {
        // User Registration
        this.app.post('/api/register', async (req, res) => {
            try {
                const { username, email, password, serverKey } = req.body;

                // Hash password
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                // Insert user
                const [result] = await this.pool.execute(
                    'INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())',
                    [username, email, hashedPassword]
                );

                // Create initial server configuration
                await this.pool.execute(
                    'INSERT INTO protected_servers (owner_id, server_name, server_key) VALUES (?, ?, ?)',
                    [result.insertId, `${username}'s Server`, serverKey]
                );

                // Generate JWT
                const token = jwt.sign(
                    { id: result.insertId, username }, 
                    process.env.JWT_SECRET, 
                    { expiresIn: '30d' }
                );

                res.status(201).json({ 
                    message: 'User registered successfully', 
                    token,
                    userId: result.insertId 
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Registration failed', error: error.message });
            }
        });

        // Server Connection Endpoint (for FiveM servers)
        this.app.post('/api/connect-server', this.authenticateJWT, async (req, res) => {
            try {
                const { serverName, serverIp, serverPort, serverKey } = req.body;

                // Validate server key
                const [servers] = await this.pool.execute(
                    'SELECT * FROM protected_servers WHERE owner_id = ? AND server_key = ?',
                    [req.user.id, serverKey]
                );

                if (servers.length === 0) {
                    return res.status(400).json({ message: 'Invalid server key' });
                }

                // Update server details
                await this.pool.execute(
                    'UPDATE protected_servers SET server_name = ?, server_ip = ?, server_port = ?, last_connected = NOW() WHERE owner_id = ?',
                    [serverName, serverIp, serverPort, req.user.id]
                );

                res.json({ 
                    message: 'Server connected successfully',
                    serverId: servers[0].id 
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Server connection failed' });
            }
        });

        // Anti-Cheat Violation Reporting
        this.app.post('/api/report-violation', async (req, res) => {
            try {
                const { 
                    serverId, 
                    playerId, 
                    playerName, 
                    violationType, 
                    details,
                    serverKey 
                } = req.body;

                // Validate server key
                const [servers] = await this.pool.execute(
                    'SELECT * FROM protected_servers WHERE id = ? AND server_key = ?',
                    [serverId, serverKey]
                );

                if (servers.length === 0) {
                    return res.status(403).json({ message: 'Unauthorized server' });
                }

                // Insert violation log
                await this.pool.execute(
                    'INSERT INTO anticheat_logs (server_id, player_id, player_name, violation_type, details, timestamp) VALUES (?, ?, ?, ?, ?, NOW())',
                    [serverId, playerId, playerName, violationType, JSON.stringify(details)]
                );

                // Broadcast violation to WebSocket clients
                this.wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'VIOLATION_DETECTED',
                            violation: {
                                serverId,
                                playerId,
                                playerName,
                                violationType,
                                details
                            }
                        }));
                    }
                });

                res.json({ message: 'Violation reported successfully' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Violation reporting failed' });
            }
        });

        // Fetch Server Configuration
        this.app.get('/api/server-config', this.authenticateJWT, async (req, res) => {
            try {
                const [servers] = await this.pool.execute(
                    'SELECT * FROM protected_servers WHERE owner_id = ?',
                    [req.user.id]
                );

                const [configs] = await this.pool.execute(
                    'SELECT * FROM anticheat_config WHERE user_id = ?',
                    [req.user.id]
                );

                res.json({
                    servers,
                    config: configs[0] || {}
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Failed to fetch server configuration' });
            }
        });

        // Update Anti-Cheat Configuration
        this.app.post('/api/update-config', this.authenticateJWT, async (req, res) => {
            try {
                const { 
                    maxViolationPoints, 
                    violationDecayTime, 
                    blacklistedWeapons,
                    enabledChecks
                } = req.body;

                // Upsert configuration
                await this.pool.execute(`
                    INSERT INTO anticheat_config 
                    (user_id, max_violation_points, violation_decay_time, blacklisted_weapons, enabled_checks) 
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    max_violation_points = ?, 
                    violation_decay_time = ?, 
                    blacklisted_weapons = ?, 
                    enabled_checks = ?
                `, [
                    req.user.id, 
                    maxViolationPoints, 
                    violationDecayTime, 
                    JSON.stringify(blacklistedWeapons),
                    JSON.stringify(enabledChecks),
                    maxViolationPoints, 
                    violationDecayTime, 
                    JSON.stringify(blacklistedWeapons),
                    JSON.stringify(enabledChecks)
                ]);

                res.json({ message: 'Configuration updated successfully' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Failed to update configuration' });
            }
        });
    }

    startServer() {
        const PORT = process.env.PORT || 3000;
        this.app.listen(PORT, () => {
            console.log(`FoxGuard API running on port ${PORT}`);
        });
    }
}

// Initialize the API
new FoxGuardAPI();
/**
 * Mackinaw Intel - API Proxy Server
 * Deploy this to Render to keep your MakCorps API key secure
 * 
 * Setup on Render:
 * 1. Create a new Web Service
 * 2. Connect your GitHub repo (or use this folder)
 * 3. Set environment variable: MAKCORPS_API_KEY = your_api_key
 * 4. Build command: npm install
 * 5. Start command: node server.js
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Your API key - set this in Render's environment variables, NOT here!
const API_KEY = process.env.MAKCORPS_API_KEY;

// CORS - allow your GitHub Pages site
app.use(cors({
    origin: [
        'https://rromanox.github.io',
        'http://localhost:3000',
        'http://127.0.0.1:5500' // Live Server
    ]
}));

app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'Mackinaw Intel API Proxy',
        hasApiKey: !!API_KEY
    });
});

// Proxy endpoint for city search
app.get('/api/city', async (req, res) => {
    if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured on server' });
    }

    try {
        const { cityid, pagination, cur, rooms, adults, checkin, checkout } = req.query;

        // Build MakCorps URL
        const params = new URLSearchParams({
            api_key: API_KEY,
            cityid: cityid || '42424',
            pagination: pagination || '0',
            cur: cur || 'USD',
            rooms: rooms || '1',
            adults: adults || '2',
            checkin,
            checkout
        });

        const url = `https://api.makcorps.com/city?${params.toString()}`;
        
        const response = await fetch(url);
        const data = await response.json();

        // Forward the response
        res.status(response.status).json(data);

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch hotel data', message: error.message });
    }
});

// Proxy endpoint for account status
app.get('/api/account', async (req, res) => {
    if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured on server' });
    }

    try {
        const url = `https://api.makcorps.com/account?api_key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Account check error:', error);
        res.status(500).json({ error: 'Failed to check account', message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🏨 Mackinaw Intel Proxy running on port ${PORT}`);
    console.log(`API Key configured: ${API_KEY ? 'Yes ✓' : 'No ✗ (set MAKCORPS_API_KEY env var)'}`);
});

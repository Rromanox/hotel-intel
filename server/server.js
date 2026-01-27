/**
 * Mackinaw Intel - API Proxy Server
 * Securely proxies requests to SerpAPI (Google Hotels)
 * 
 * Deploy to Render.com:
 * 1. Create a new Web Service
 * 2. Connect your GitHub repo
 * 3. Set environment variable: SERPAPI_KEY = your_api_key
 * 4. Root Directory: server
 * 5. Build command: npm install
 * 6. Start command: node server.js
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Get API key from environment variable
const SERPAPI_KEY = process.env.SERPAPI_KEY;

// CORS configuration - allow requests from GitHub Pages
app.use(cors({
    origin: [
        'https://rromanox.github.io',
        'http://localhost:3000',
        'http://127.0.0.1:5500'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'Mackinaw Intel API Proxy (SerpAPI)',
        hasApiKey: !!SERPAPI_KEY 
    });
});

/**
 * Proxy endpoint for Google Hotels via SerpAPI
 * GET /api/hotels?checkin=2026-05-10&checkout=2026-05-11
 */
app.get('/api/hotels', async (req, res) => {
    if (!SERPAPI_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    const { checkin, checkout, adults = 2 } = req.query;

    if (!checkin || !checkout) {
        return res.status(400).json({ error: 'checkin and checkout dates required' });
    }

    try {
        const params = new URLSearchParams({
            engine: 'google_hotels',
            q: 'Mackinaw City Michigan Hotels',
            check_in_date: checkin,
            check_out_date: checkout,
            adults: adults,
            currency: 'USD',
            gl: 'us',
            hl: 'en',
            sort_by: '3', // Sort by lowest price to get more variety
            api_key: SERPAPI_KEY
        });

        const url = `https://serpapi.com/search.json?${params}`;
        console.log(`Fetching: ${checkin} to ${checkout}`);

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('SerpAPI Error:', data.error);
            return res.status(400).json({ error: data.error });
        }

        // Return the properties array
        res.json({
            success: true,
            date: checkin,
            properties: data.properties || [],
            search_metadata: data.search_metadata
        });

    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Check API credits/account status
 * GET /api/account
 */
app.get('/api/account', async (req, res) => {
    if (!SERPAPI_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        // SerpAPI account info endpoint
        const url = `https://serpapi.com/account.json?api_key=${SERPAPI_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: data.error });
        }

        res.json({
            success: true,
            plan: data.plan_name || 'Free',
            searchesPerMonth: data.total_searches_left !== undefined 
                ? data.total_searches_left + (data.this_month_usage || 0)
                : 100,
            searchesUsed: data.this_month_usage || 0,
            searchesRemaining: data.total_searches_left || data.plan_searches_left || 0,
            accountEmail: data.account_email || 'N/A'
        });

    } catch (error) {
        console.error('Account check error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🏨 Mackinaw Intel Proxy (SerpAPI) running on port ${PORT}`);
    console.log(`API Key configured: ${SERPAPI_KEY ? 'Yes ✓' : 'No ✗'}`);
});

/**
 * Mackinaw Intel - API Proxy Server with MongoDB
 * - Proxies requests to SerpAPI (Google Hotels)
 * - Stores rate data in MongoDB for cross-device sync
 */

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 10000;

// Environment variables
const SERPAPI_KEY = process.env.SERPAPI_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB connection
let db = null;
let ratesCollection = null;

async function connectDB() {
    if (!MONGODB_URI) {
        console.log('⚠️ No MongoDB URI - running without database');
        return;
    }
    
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db('hotelintel');
        ratesCollection = db.collection('rates');
        
        // Create index on date for fast lookups
        await ratesCollection.createIndex({ date: 1 }, { unique: true });
        
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
    }
}

// CORS configuration
app.use(cors({
    origin: [
        'https://rromanox.github.io',
        'http://localhost:3000',
        'http://127.0.0.1:5500'
    ],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '5mb' }));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'Mackinaw Intel API (SerpAPI + MongoDB)',
        hasApiKey: !!SERPAPI_KEY,
        hasDatabase: !!db
    });
});

// ============================================
// SERPAPI ENDPOINTS
// ============================================

/**
 * Fetch hotels from SerpAPI
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
        // Primary search - focused query with lowest price sort to get more hotels
        const params = new URLSearchParams({
            engine: 'google_hotels',
            q: 'Mackinaw City, Michigan, United States',
            check_in_date: checkin,
            check_out_date: checkout,
            adults: adults,
            currency: 'USD',
            gl: 'us',
            hl: 'en',
            sort_by: '3', // lowest price - surfaces budget/boutique hotels
            api_key: SERPAPI_KEY
        });

        const url = `https://serpapi.com/search.json?${params}`;
        console.log(`📡 Fetching: ${checkin}`);

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('SerpAPI Error:', data.error);
            return res.status(400).json({ error: data.error });
        }

        let allProperties = data.properties || [];
        console.log(`   Found ${allProperties.length} hotels in primary search`);

        // Check if our hotels are in results
        const hasAmerican = allProperties.some(p => 
            p.name?.toLowerCase().includes('american boutique'));
        const hasRiviera = allProperties.some(p => 
            p.name?.toLowerCase().includes('riviera'));

        // If American Boutique Inn is missing, try a targeted search
        if (!hasAmerican) {
            console.log(`   ⚠️ American Boutique missing - trying targeted search`);
            try {
                const backupParams = new URLSearchParams({
                    engine: 'google_hotels',
                    q: 'American Boutique Inn Mackinaw City Michigan',
                    check_in_date: checkin,
                    check_out_date: checkout,
                    adults: adults,
                    currency: 'USD',
                    gl: 'us',
                    hl: 'en',
                    api_key: SERPAPI_KEY
                });

                const backupUrl = `https://serpapi.com/search.json?${backupParams}`;
                const backupResponse = await fetch(backupUrl);
                const backupData = await backupResponse.json();

                if (backupData.properties?.length > 0) {
                    // Add American Boutique if found
                    const american = backupData.properties.find(p => 
                        p.name?.toLowerCase().includes('american boutique'));
                    if (american) {
                        allProperties.push(american);
                        console.log(`   ✅ Found American Boutique in targeted search`);
                    }
                }
            } catch (backupError) {
                console.log(`   ❌ Backup search failed: ${backupError.message}`);
            }
        }

        // If still missing hotels, try highest rating sort for different results
        if (allProperties.length < 10) {
            console.log(`   ⚠️ Only ${allProperties.length} hotels - trying rating sort`);
            try {
                const ratingParams = new URLSearchParams({
                    engine: 'google_hotels',
                    q: 'hotels Mackinaw City MI',
                    check_in_date: checkin,
                    check_out_date: checkout,
                    adults: adults,
                    currency: 'USD',
                    gl: 'us',
                    hl: 'en',
                    sort_by: '8', // highest rating
                    api_key: SERPAPI_KEY
                });

                const ratingUrl = `https://serpapi.com/search.json?${ratingParams}`;
                const ratingResponse = await fetch(ratingUrl);
                const ratingData = await ratingResponse.json();

                if (ratingData.properties?.length > 0) {
                    // Add any new hotels not already in list
                    const existingNames = new Set(allProperties.map(p => p.name?.toLowerCase().trim()));
                    ratingData.properties.forEach(p => {
                        if (!existingNames.has(p.name?.toLowerCase().trim())) {
                            allProperties.push(p);
                        }
                    });
                    console.log(`   ✅ Added hotels from rating sort, now ${allProperties.length} total`);
                }
            } catch (ratingError) {
                console.log(`   ❌ Rating sort search failed: ${ratingError.message}`);
            }
        }

        // Deduplicate by hotel name
        const seen = new Set();
        const uniqueProperties = allProperties.filter(p => {
            const key = p.name?.toLowerCase().trim();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        console.log(`   📊 Total unique hotels: ${uniqueProperties.length}`);

        res.json({
            success: true,
            date: checkin,
            properties: uniqueProperties,
            search_metadata: data.search_metadata
        });

    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Check SerpAPI account status
 * GET /api/account
 */
app.get('/api/account', async (req, res) => {
    if (!SERPAPI_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
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

// ============================================
// DATABASE ENDPOINTS
// ============================================

/**
 * Save rate data for a date
 * POST /api/rates
 * Body: { date: "2026-05-10", hotels: [...], timestamp: "..." }
 */
app.post('/api/rates', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    const { date, hotels, timestamp } = req.body;

    if (!date || !hotels) {
        return res.status(400).json({ error: 'date and hotels required' });
    }

    try {
        const result = await ratesCollection.updateOne(
            { date },
            { 
                $set: { 
                    date,
                    hotels,
                    timestamp: timestamp || new Date().toISOString(),
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );

        console.log(`💾 Saved rates for ${date}: ${hotels.length} hotels`);
        res.json({ success: true, date, hotelsCount: hotels.length });

    } catch (error) {
        console.error('Save error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Save multiple dates at once
 * POST /api/rates/bulk
 * Body: { dates: { "2026-05-10": {...}, "2026-05-11": {...} } }
 */
app.post('/api/rates/bulk', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    const { dates } = req.body;

    if (!dates || typeof dates !== 'object') {
        return res.status(400).json({ error: 'dates object required' });
    }

    try {
        const operations = Object.entries(dates).map(([date, data]) => ({
            updateOne: {
                filter: { date },
                update: { 
                    $set: { 
                        date,
                        hotels: data.hotels || [],
                        timestamp: data.timestamp || new Date().toISOString(),
                        updatedAt: new Date()
                    }
                },
                upsert: true
            }
        }));

        const result = await ratesCollection.bulkWrite(operations);
        console.log(`💾 Bulk saved ${operations.length} dates`);
        
        res.json({ 
            success: true, 
            datesUpdated: result.upsertedCount + result.modifiedCount 
        });

    } catch (error) {
        console.error('Bulk save error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get database summary - list all dates and counts
 * GET /api/rates/summary
 * NOTE: This must come BEFORE /api/rates/:date to avoid matching "summary" as a date
 */
app.get('/api/rates/summary', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    try {
        // Get all dates with hotel counts
        const data = await ratesCollection.find({}, { 
            projection: { date: 1, 'hotels': 1, updatedAt: 1 } 
        }).sort({ date: 1 }).toArray();
        
        // Group by month
        const byMonth = {};
        data.forEach(item => {
            const month = item.date.substring(0, 7); // "2026-05"
            if (!byMonth[month]) {
                byMonth[month] = { dates: [], totalHotels: 0 };
            }
            byMonth[month].dates.push({
                date: item.date,
                hotelCount: item.hotels?.length || 0,
                updatedAt: item.updatedAt
            });
            byMonth[month].totalHotels += item.hotels?.length || 0;
        });

        res.json({ 
            success: true, 
            totalDates: data.length,
            byMonth,
            allDates: data.map(d => d.date)
        });

    } catch (error) {
        console.error('Summary error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get rate data for a specific date
 * GET /api/rates/:date
 */
app.get('/api/rates/:date', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    const { date } = req.params;

    try {
        const data = await ratesCollection.findOne({ date });
        
        if (!data) {
            return res.status(404).json({ error: 'No data for this date' });
        }

        res.json({ success: true, data });

    } catch (error) {
        console.error('Fetch error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get all rate data
 * GET /api/rates
 * Query params: ?from=2026-05-01&to=2026-05-31
 */
app.get('/api/rates', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    const { from, to } = req.query;

    try {
        let query = {};
        
        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = from;
            if (to) query.date.$lte = to;
        }

        const data = await ratesCollection.find(query).sort({ date: 1 }).toArray();
        
        // Convert to object format { "2026-05-10": {...}, ... }
        const dates = {};
        data.forEach(item => {
            dates[item.date] = {
                date: item.date,
                hotels: item.hotels,
                timestamp: item.timestamp,
                isDemo: false
            };
        });

        res.json({ 
            success: true, 
            count: data.length,
            dates 
        });

    } catch (error) {
        console.error('Fetch all error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete rate data for a date
 * DELETE /api/rates/:date
 */
app.delete('/api/rates/:date', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    const { date } = req.params;

    try {
        const result = await ratesCollection.deleteOne({ date });
        res.json({ success: true, deleted: result.deletedCount > 0 });

    } catch (error) {
        console.error('Delete error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Clear all rate data
 * DELETE /api/rates
 */
app.delete('/api/rates', async (req, res) => {
    if (!ratesCollection) {
        return res.status(503).json({ error: 'Database not available' });
    }

    try {
        const result = await ratesCollection.deleteMany({});
        console.log(`🗑️ Cleared all rates: ${result.deletedCount} documents`);
        res.json({ success: true, deleted: result.deletedCount });

    } catch (error) {
        console.error('Clear error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🏨 Mackinaw Intel Server running on port ${PORT}`);
        console.log(`   SerpAPI: ${SERPAPI_KEY ? '✅' : '❌'}`);
        console.log(`   MongoDB: ${db ? '✅' : '❌'}`);
    });
});

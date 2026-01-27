/**
 * Mackinaw Intel - Configuration
 * Hotel Rate Intelligence Platform
 * 
 * SECURITY: API key is handled via Render proxy server
 * Your key never touches the browser or GitHub!
 * 
 * NOW USING: SerpAPI (Google Hotels)
 */

const CONFIG = {
    // API Settings - SerpAPI via Render Proxy
    api: {
        // Render Proxy URL (secure - API key stored on server)
        proxyUrl: 'https://hotel-intel-api-awb4.onrender.com/api/hotels',
        accountUrl: 'https://hotel-intel-api-awb4.onrender.com/api/account',
        
        // API provider
        provider: 'serpapi',
        
        // Default search params
        params: {
            adults: '2',
            currency: 'USD'
        }
    },

    // ===========================================
    // YOUR HOTELS (2)
    // ===========================================
    yourHotels: {
        'Riviera Motel': {
            aliases: ['riviera', 'riviera motel']
        },
        'American Boutique Inn': {
            aliases: ['american boutique', 'american boutique inn', 'american boutique inn lakeview']
        }
    },

    // ===========================================
    // YOUR DIRECT COMPETITORS (based on SerpAPI Google Hotels data)
    // ===========================================
    trackedCompetitors: [
        'Super 8',           // "Super 8 by Wyndham Bridgeview of Mackinaw City"
        'Lighthouse View',   // "Lighthouse View Motel"  
        'Days Inn',          // "Days Inn by Wyndham Mackinaw City - Lakeview"
        'Comfort Inn',       // "Comfort Inn Lakeside"
        'Quality Inn',       // "Quality Inn & Suites Mackinaw City Beachfront"
        'Baymont',           // "Baymont by Wyndham Mackinaw City"
        'Holiday Inn',       // "Holiday Inn Express Mackinaw City by IHG"
        'Clarion',           // "Clarion Hotel Mackinaw City Beachfront"
        'Best Western',      // "Best Western Plus Dockside Waterfront Inn"
        'Clearwater',        // "Clearwater Lakeshore Motel"
        'Ramada',            // "Ramada by Wyndham Mackinaw City Waterfront"
        'Bridge Vista',      // "Bridge Vista Beach Hotel & Convention Center"
        'Bayside'            // "Bayside Hotel of Mackinac"
    ],

    // Update Settings
    updates: {
        intervalDays: 15,
        storageKey: 'mackinawIntelData',
        lastUpdateKey: 'mackinawIntelLastUpdate',
        settingsKey: 'mackinawIntelSettings'
    },

    // Date Range for Data Collection (May - October 2026)
    dateRange: {
        startMonth: 5,
        startYear: 2026,
        monthsToCollect: 6 // May, June, July, August, September, October
    },

    // UI Settings
    ui: {
        defaultTheme: 'dark',
        animationsEnabled: true,
        toastDuration: 4000
    },

    // Chart Colors
    chartColors: {
        primary: '#fbbf24',      // Gold - Your hotels
        secondary: '#3d5a80',    // Navy - Market average
        tertiary: '#8aa4c1',     // Light blue - Other hotels
        success: '#10b981',      // Green - Positive changes
        danger: '#ef4444',       // Red - Negative changes
        competitor: '#8b5cf6',   // Purple - Tracked competitors
        grid: 'rgba(148, 163, 184, 0.2)'
    },

    // API Plans Reference
    apiPlans: {
        free: { calls: 30, name: 'Free Trial' },
        basic: { calls: 10000, name: 'Basic ($350/mo)' },
        advance: { calls: 50000, name: 'Advance ($500/mo)' }
    }
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Check if a hotel is one of YOUR properties
 */
function isYourHotel(hotelName) {
    if (!hotelName) return false;
    const normalized = hotelName.toLowerCase().trim();
    
    for (const [name, data] of Object.entries(CONFIG.yourHotels)) {
        if (normalized === name.toLowerCase()) return true;
        if (data.aliases.some(alias => normalized.includes(alias))) return true;
    }
    return false;
}

/**
 * Check if a hotel is a tracked competitor
 */
function isTrackedCompetitor(hotelName) {
    if (!hotelName) return false;
    const normalized = hotelName.toLowerCase().trim();
    
    return CONFIG.trackedCompetitors.some(comp => 
        normalized.includes(comp.toLowerCase())
    );
}

/**
 * Check if hotel should be highlighted (your hotel OR tracked competitor)
 */
function isTrackedHotel(hotelName) {
    return isYourHotel(hotelName) || isTrackedCompetitor(hotelName);
}

/**
 * Get hotel category for styling
 * Returns: 'yours', 'competitor', or 'market'
 */
function getHotelCategory(hotelName) {
    if (isYourHotel(hotelName)) return 'yours';
    if (isTrackedCompetitor(hotelName)) return 'competitor';
    return 'market';
}

/**
 * Get hotel ID by name
 */
function getHotelId(hotelName) {
    if (!hotelName) return null;
    const normalized = hotelName.toLowerCase().trim();
    
    for (const [name, data] of Object.entries(CONFIG.yourHotels)) {
        if (normalized === name.toLowerCase()) return data.id;
        if (data.aliases.some(alias => normalized.includes(alias))) return data.id;
    }
    return null;
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '--';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Format date for API calls (YYYY-MM-DD)
 */
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get dates for a month
 */
function getDatesInMonth(year, month) {
    const dates = [];
    const lastDay = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month - 1, day);
        dates.push(formatDateForAPI(date));
    }
    
    return dates;
}

/**
 * Calculate percentage change
 */
function calculatePercentChange(oldVal, newVal) {
    if (!oldVal || !newVal || oldVal === 0) return null;
    return ((newVal - oldVal) / oldVal * 100).toFixed(1);
}

// Month/Day names
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

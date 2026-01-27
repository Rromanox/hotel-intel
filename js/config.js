/**
 * Mackinaw Intel - Configuration
 * Hotel Rate Intelligence Platform
 */

const CONFIG = {
    // MakCorp API Settings
    api: {
        baseUrl: 'https://api.makcorps.com/city',
        apiKey: '6978c0209add31b74d40b7c1',
        cityId: '42424',
        params: {
            pagination: '0',
            cur: 'USD',
            rooms: '1',
            adults: '2'
        }
    },

    // Your Hotels to Highlight
    yourHotels: {
        'Riviera Motel': {
            id: 1162889,
            aliases: ['riviera', 'riviera motel']
        },
        'American Boutique Inn': {
            id: 564648,
            aliases: ['american boutique', 'american boutique inn']
        }
    },

    // Update Settings
    updates: {
        intervalDays: 15,
        storageKey: 'mackinawIntelData',
        lastUpdateKey: 'mackinawIntelLastUpdate',
        settingsKey: 'mackinawIntelSettings'
    },

    // Date Range for Initial Collection
    dateRange: {
        startMonth: 5, // May
        startYear: 2026,
        monthsToCollect: 5 // May through September
    },

    // UI Settings
    ui: {
        defaultTheme: 'light',
        animationsEnabled: true,
        toastDuration: 4000
    },

    // Chart Colors
    chartColors: {
        primary: '#fbbf24',
        secondary: '#3d5a80',
        tertiary: '#8aa4c1',
        success: '#10b981',
        danger: '#ef4444',
        grid: 'rgba(148, 163, 184, 0.2)'
    }
};

// Helper to check if a hotel is one of "your" properties
function isYourHotel(hotelName) {
    if (!hotelName) return false;
    const normalized = hotelName.toLowerCase().trim();
    
    for (const [name, data] of Object.entries(CONFIG.yourHotels)) {
        if (normalized === name.toLowerCase()) return true;
        if (data.aliases.some(alias => normalized.includes(alias))) return true;
    }
    return false;
}

// Helper to get hotel ID by name
function getHotelId(hotelName) {
    if (!hotelName) return null;
    const normalized = hotelName.toLowerCase().trim();
    
    for (const [name, data] of Object.entries(CONFIG.yourHotels)) {
        if (normalized === name.toLowerCase()) return data.id;
        if (data.aliases.some(alias => normalized.includes(alias))) return data.id;
    }
    return null;
}

// Format currency
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '--';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Format date for display
function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Format date for API calls (YYYY-MM-DD)
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get dates for a month
function getDatesInMonth(year, month) {
    const dates = [];
    const lastDay = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month - 1, day);
        dates.push(formatDateForAPI(date));
    }
    
    return dates;
}

// Calculate percentage change
function calculatePercentChange(oldVal, newVal) {
    if (!oldVal || !newVal || oldVal === 0) return null;
    return ((newVal - oldVal) / oldVal * 100).toFixed(1);
}

// Month names
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

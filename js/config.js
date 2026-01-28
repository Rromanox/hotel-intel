/**
 * Mackinaw Intel - Configuration
 * Hotel Rate Intelligence Platform
 * 
 * SECURITY: API key is handled via Render proxy server
 * Your key never touches the browser or GitHub!
 * 
 * NOW USING: SearchAPI.io (Google Hotels) + MongoDB
 */

const CONFIG = {
    // API Settings - SearchAPI.io via Render Proxy
    api: {
        // Render Proxy URL (secure - API key stored on server)
        proxyUrl: 'https://hotel-intel-api-awb4.onrender.com/api/hotels',
        accountUrl: 'https://hotel-intel-api-awb4.onrender.com/api/account',
        
        // Database endpoints
        ratesUrl: 'https://hotel-intel-api-awb4.onrender.com/api/rates',
        summaryUrl: 'https://hotel-intel-api-awb4.onrender.com/api/rates/summary',
        
        // API provider
        provider: 'searchapi',
        
        // Default search params
        params: {
            adults: '2',
            currency: 'USD'
        }
    },

    // Map settings - Mackinaw City center
    map: {
        center: [45.7833, -84.7278],
        zoom: 15
    },

    // ===========================================
    // HOTEL COORDINATES (GPS locations in Mackinaw City)
    // Based on actual addresses on North/South Huron Ave
    // ===========================================
    hotelCoordinates: {
        // Your Hotels
        'Riviera Motel': [45.7789, -84.7271],  // South Huron area
        'American Boutique Inn': [45.7862, -84.7274],  // 517 N Huron
        'American Boutique Inn - Lakeview': [45.7862, -84.7274],
        
        // Hotels along North Huron Avenue (north to south)
        'Lighthouse View Motel': [45.7887, -84.7269],  // 699 N Huron
        'Bridge Vista Beach Hotel': [45.7878, -84.7267],
        'Bridge Vista Beach Hotel & Convention Center': [45.7878, -84.7267],
        'Holiday Inn Express': [45.7870, -84.7265],
        'Holiday Inn Express Mackinaw City': [45.7870, -84.7265],
        'Parkside Inn Bridgeview': [45.7858, -84.7272],
        'Super 8 by Wyndham Bridgeview of Mackinaw City': [45.7855, -84.7273],
        'Baymont by Wyndham Mackinaw City': [45.7845, -84.7285],  // 109 N Nicolet
        
        // Hotels along South Huron Avenue  
        'Best Western Plus Dockside Waterfront Inn': [45.7808, -84.7268],  // 505 S Huron
        'Best Western Harbour Pointe Lakefront': [45.7805, -84.7265],
        'Ramada by Wyndham Mackinaw City Waterfront': [45.7795, -84.7262],
        'Clarion Hotel Beachfront': [45.7785, -84.7258],
        'Clarion Hotel Mackinaw City Beachfront': [45.7785, -84.7258],
        'Quality Inn & Suites Beachfront': [45.7775, -84.7255],
        'Quality Inn & Suites Mackinaw City Beachfront': [45.7775, -84.7255],
        
        // Hotels near Central Ave / Louvigny
        'Comfort Inn Lakeside': [45.7838, -84.7295],
        'Days Inn by Wyndham Mackinaw City - Lakeview': [45.7842, -84.7302],
        'Super 8 by Wyndham Mackinaw City/Beachfront Area': [45.7765, -84.7252],
        
        // Other hotels in area
        'Bayside Hotel of Mackinac': [45.7820, -84.7275],
        'Hamilton Inn Select Beachfront': [45.7812, -84.7270],
        'Hamilton Inn': [45.7812, -84.7270],
        'Crown Choice Inn & Suites': [45.7835, -84.7290],
        'Crown Choice Inn': [45.7835, -84.7290],
        'Apple Blossom Boutique': [45.7848, -84.7280],
        'Clearwater Lakeshore Motel': [45.7802, -84.7263],
        'Bridgeview Motel': [45.7852, -84.7275],
        
        // St. Ignace hotels (across the bridge - will show at edge of map)
        'Voyager Inn of Saint Ignace': [45.8667, -84.7267],
        'Days Inn St. Ignace': [45.8655, -84.7260],
        
        // Fallback for Cedar Hill
        'Cedar Hill Lodge': [45.7830, -84.7288]
    },

    // ===========================================
    // YOUR HOTELS (2)
    // ===========================================
    yourHotels: {
        'Riviera Motel': {
            aliases: ['riviera', 'riviera motel', 'riviera motel of mackinaw']
        },
        'American Boutique Inn': {
            aliases: ['american boutique', 'american boutique inn', 'american boutique inn lakeview']
        }
    },

    // ===========================================
    // DIRECT COMPETITORS (closest/most similar to you)
    // These get special highlighting (orange)
    // ===========================================
    directCompetitors: [
        'lighthouse view',      // Lighthouse View Motel
        'parkside inn',         // Parkside Inn Bridgeview
        'super 8 by wyndham bridgeview'  // Super 8 Bridgeview (not Beachfront)
    ],

    // ===========================================
    // ALL TRACKED COMPETITORS (for general tracking)
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
        'Bayside',           // "Bayside Hotel of Mackinac"
        'Parkside'           // "Parkside Inn Bridgeview"
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
        toastDuration: 4000,
        defaultLanguage: 'en'
    },

    // Chart Colors
    chartColors: {
        primary: '#fbbf24',           // Gold - Your hotels
        secondary: '#3d5a80',         // Navy - Market average
        tertiary: '#8aa4c1',          // Light blue - Other hotels
        success: '#10b981',           // Green - Positive changes
        danger: '#ef4444',            // Red - Negative changes
        competitor: '#8b5cf6',        // Purple - Tracked competitors
        directCompetitor: '#f97316',  // Orange - Direct competitors
        grid: 'rgba(148, 163, 184, 0.2)'
    },

    // API Plans Reference
    apiPlans: {
        free: { calls: 100, name: 'Free (SearchAPI.io)' },
        basic: { calls: 1000, name: 'Basic' },
        pro: { calls: 5000, name: 'Pro' }
    }
};

// ===========================================
// TRANSLATIONS (English & Spanish)
// ===========================================
const TRANSLATIONS = {
    en: {
        // Navigation
        dashboard: 'Dashboard',
        monthlyViews: 'Monthly Views',
        mapView: 'Map View',
        analyticsHub: 'Analytics Hub',
        competitorIntel: 'Competitor Intel',
        myHotels: 'My Hotels',
        settings: 'Settings',
        logout: 'Logout',
        
        // Dashboard
        marketOverview: 'Market Overview',
        lowestRate: 'Lowest Rate',
        highestRate: 'Highest Rate',
        marketAverage: 'Market Average',
        priceSpread: 'Price Spread',
        rateTrends: 'Rate Trends',
        yourProperties: 'Your Properties',
        priceIntelligence: 'Price Intelligence',
        yourPricePosition: 'Your Price Position',
        priceGapAnalysis: 'Price Gap Analysis',
        priceAlerts: 'Price Alerts',
        highDemandDates: 'High Demand Dates',
        recentChanges: 'Recent Changes',
        competitorPriceHistory: 'Competitor Price History',
        
        // My Hotels Tab
        myHotelsVsCompetitors: 'My Hotels vs Direct Competitors',
        todaysBattle: "Today's Battle",
        priceRecommendation: 'Price Recommendation',
        weeklyView: 'Weekly View (Next 7 Days)',
        competitiveAlerts: 'Competitive Alerts',
        gapConsistency: 'Gap Consistency Score',
        suggestedPrice: 'Suggested Price',
        aggressive: 'Aggressive',
        competitive: 'Competitive',
        premium: 'Premium',
        
        // Price Position
        outOf: 'out of',
        hotels: 'hotels',
        budgetFriendly: 'Budget-Friendly',
        midRange: 'Mid-Range',
        premium: 'Premium',
        
        // Comparisons
        vsMarketAverage: 'vs Market Average',
        vsCheapest: 'vs Cheapest',
        vsMostExpensive: 'vs Most Expensive',
        vsYou: 'vs You',
        
        // Alerts
        increased: 'Increased',
        decreased: 'Decreased',
        changedOn: 'Changed',
        forDate: 'for',
        
        // Time
        daily: 'Daily',
        monthly: 'Month Avg',
        today: 'Today',
        
        // Settings
        apiCredits: 'API Credits',
        remaining: 'Remaining',
        used: 'Used',
        totalLimit: 'Total Limit',
        checkCredits: 'Check Credits',
        language: 'Language',
        
        // Actions
        updateData: 'Update Data',
        syncFromCloud: 'Sync From Cloud',
        checkDatabase: 'Check Database',
        selectCompetitor: 'Select Competitor',
        
        // Status
        connected: 'Connected',
        offline: 'Offline',
        loading: 'Loading...',
        noData: 'No data available',
        
        // Misc
        rank: 'Rank',
        rate: 'Rate',
        rating: 'Rating',
        gap: 'Gap',
        position: 'Position',
        date: 'Date',
        hotel: 'Hotel',
        price: 'Price',
        change: 'Change',
        average: 'Average',
        
        // Recommendations
        beatAllCompetitors: 'Beat all direct competitors',
        middleOfPack: 'Middle of competitor pack',
        aboveCompetitors: 'Above competitors, below market',
        competitorRange: 'Competitor range',
        yourCurrentRate: 'Your current rate'
    },
    es: {
        // Navigation
        dashboard: 'Panel Principal',
        monthlyViews: 'Vistas Mensuales',
        mapView: 'Vista de Mapa',
        analyticsHub: 'Centro de Análisis',
        competitorIntel: 'Inteligencia de Competidores',
        myHotels: 'Mis Hoteles',
        settings: 'Configuración',
        logout: 'Cerrar Sesión',
        
        // Dashboard
        marketOverview: 'Resumen del Mercado',
        lowestRate: 'Tarifa Más Baja',
        highestRate: 'Tarifa Más Alta',
        marketAverage: 'Promedio del Mercado',
        priceSpread: 'Rango de Precios',
        rateTrends: 'Tendencias de Tarifas',
        yourProperties: 'Tus Propiedades',
        priceIntelligence: 'Inteligencia de Precios',
        yourPricePosition: 'Tu Posición de Precio',
        priceGapAnalysis: 'Análisis de Brecha de Precios',
        priceAlerts: 'Alertas de Precios',
        highDemandDates: 'Fechas de Alta Demanda',
        recentChanges: 'Cambios Recientes',
        competitorPriceHistory: 'Historial de Precios de Competidores',
        
        // My Hotels Tab
        myHotelsVsCompetitors: 'Mis Hoteles vs Competidores Directos',
        todaysBattle: 'Batalla de Hoy',
        priceRecommendation: 'Recomendación de Precio',
        weeklyView: 'Vista Semanal (Próximos 7 Días)',
        competitiveAlerts: 'Alertas Competitivas',
        gapConsistency: 'Puntuación de Consistencia de Brecha',
        suggestedPrice: 'Precio Sugerido',
        aggressive: 'Agresivo',
        competitive: 'Competitivo',
        premium: 'Premium',
        
        // Price Position
        outOf: 'de',
        hotels: 'hoteles',
        budgetFriendly: 'Económico',
        midRange: 'Rango Medio',
        
        // Comparisons
        vsMarketAverage: 'vs Promedio del Mercado',
        vsCheapest: 'vs Más Barato',
        vsMostExpensive: 'vs Más Caro',
        vsYou: 'vs Tú',
        
        // Alerts
        increased: 'Aumentó',
        decreased: 'Disminuyó',
        changedOn: 'Cambió',
        forDate: 'para',
        
        // Time
        daily: 'Diario',
        monthly: 'Prom. Mensual',
        today: 'Hoy',
        
        // Settings
        apiCredits: 'Créditos de API',
        remaining: 'Restantes',
        used: 'Usados',
        totalLimit: 'Límite Total',
        checkCredits: 'Verificar Créditos',
        language: 'Idioma',
        
        // Actions
        updateData: 'Actualizar Datos',
        syncFromCloud: 'Sincronizar desde la Nube',
        checkDatabase: 'Verificar Base de Datos',
        selectCompetitor: 'Seleccionar Competidor',
        
        // Status
        connected: 'Conectado',
        offline: 'Sin Conexión',
        loading: 'Cargando...',
        noData: 'Sin datos disponibles',
        
        // Misc
        rank: 'Posición',
        rate: 'Tarifa',
        rating: 'Calificación',
        gap: 'Brecha',
        position: 'Posición',
        date: 'Fecha',
        hotel: 'Hotel',
        price: 'Precio',
        change: 'Cambio',
        average: 'Promedio',
        
        // Recommendations
        beatAllCompetitors: 'Supera a todos los competidores directos',
        middleOfPack: 'En medio del grupo de competidores',
        aboveCompetitors: 'Arriba de competidores, debajo del mercado',
        competitorRange: 'Rango de competidores',
        yourCurrentRate: 'Tu tarifa actual'
    }
};

// Current language state
let currentLanguage = localStorage.getItem('mackinawIntelLanguage') || 'en';

/**
 * Get translated text
 */
function t(key) {
    return TRANSLATIONS[currentLanguage]?.[key] || TRANSLATIONS['en']?.[key] || key;
}

/**
 * Set language
 */
function setLanguage(lang) {
    if (TRANSLATIONS[lang]) {
        currentLanguage = lang;
        localStorage.setItem('mackinawIntelLanguage', lang);
        return true;
    }
    return false;
}

/**
 * Get current language
 */
function getLanguage() {
    return currentLanguage;
}

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
 * Check if a hotel is a DIRECT competitor (closest competition)
 */
function isDirectCompetitor(hotelName) {
    if (!hotelName) return false;
    const normalized = hotelName.toLowerCase().trim();
    
    return CONFIG.directCompetitors.some(comp => 
        normalized.includes(comp.toLowerCase())
    );
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
function isTrackedHotel(hotelName, onlyYours = false) {
    if (onlyYours) {
        return isYourHotel(hotelName);
    }
    return isYourHotel(hotelName) || isTrackedCompetitor(hotelName);
}

/**
 * Get hotel category for styling
 * Returns: 'yours', 'direct', 'competitor', or 'market'
 */
function getHotelCategory(hotelName) {
    if (isYourHotel(hotelName)) return 'yours';
    if (isDirectCompetitor(hotelName)) return 'direct';
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
    const locale = currentLanguage === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Format date short (no year)
 */
function formatDateShort(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const locale = currentLanguage === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
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

/**
 * Get next N dates from a given date
 */
function getNextDates(startDate, numDays) {
    const dates = [];
    const start = new Date(startDate + 'T00:00:00');
    
    for (let i = 0; i < numDays; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(formatDateForAPI(date));
    }
    
    return dates;
}

// Month/Day names
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_NAMES_SHORT_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

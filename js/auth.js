/**
 * Mackinaw Intel - Authentication Module
 * Simple client-side authentication
 * 
 * NOTE: For production, use server-side authentication!
 * This is a basic protection layer for casual access prevention.
 */

const Auth = {
    // Authorized users (username: password hash)
    // To add users: Auth.hashPassword('yourpassword') in console, then add here
    users: {
        'admin': '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // admin
        'kevin': '1c8bfe8f801d79745c4631d09fff36c82aa37fc4cce4fc946683d7b336b63032'  // kevin123
    },

    // Session storage key
    SESSION_KEY: 'mackinawIntelSession',
    
    // Session duration (24 hours in milliseconds)
    SESSION_DURATION: 24 * 60 * 60 * 1000,

    /**
     * Initialize authentication
     */
    init() {
        // Check if already logged in
        if (this.isLoggedIn()) {
            this.showApp();
            return true;
        }
        
        // Show login screen
        this.showLogin();
        this.bindEvents();
        return false;
    },

    /**
     * Bind login form events
     */
    bindEvents() {
        const form = document.getElementById('login-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    },

    /**
     * Handle login attempt
     */
    async handleLogin() {
        const username = document.getElementById('login-username').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        // Clear previous error
        errorEl.textContent = '';

        // Validate
        if (!username || !password) {
            errorEl.textContent = 'Please enter username and password';
            return;
        }

        // Hash password and check
        const hashedPassword = await this.hashPassword(password);
        
        if (this.users[username] && this.users[username] === hashedPassword) {
            // Success - create session
            this.createSession(username);
            this.showApp();
        } else {
            // Failed
            errorEl.textContent = 'Invalid username or password';
            document.getElementById('login-password').value = '';
        }
    },

    /**
     * Hash password using SHA-256
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Create login session
     */
    createSession(username) {
        const session = {
            username: username,
            loginTime: Date.now(),
            expiresAt: Date.now() + this.SESSION_DURATION
        };
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    },

    /**
     * Check if user is logged in with valid session
     */
    isLoggedIn() {
        const sessionData = localStorage.getItem(this.SESSION_KEY);
        if (!sessionData) return false;

        try {
            const session = JSON.parse(sessionData);
            
            // Check if session expired
            if (Date.now() > session.expiresAt) {
                this.logout();
                return false;
            }
            
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Get current user
     */
    getCurrentUser() {
        const sessionData = localStorage.getItem(this.SESSION_KEY);
        if (!sessionData) return null;
        
        try {
            const session = JSON.parse(sessionData);
            return session.username;
        } catch {
            return null;
        }
    },

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        this.showLogin();
        window.location.reload();
    },

    /**
     * Show login screen, hide app
     */
    showLogin() {
        const loginScreen = document.getElementById('login-screen');
        const appContainer = document.getElementById('app-container');
        const loadingOverlay = document.getElementById('loading-overlay');
        
        if (loginScreen) loginScreen.classList.remove('hidden');
        if (appContainer) appContainer.style.display = 'none';
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    },

    /**
     * Show app, hide login screen
     */
    showApp() {
        const loginScreen = document.getElementById('login-screen');
        const appContainer = document.getElementById('app-container');
        const loadingOverlay = document.getElementById('loading-overlay');
        
        if (loginScreen) loginScreen.classList.add('hidden');
        if (appContainer) appContainer.style.display = '';
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
        
        // Initialize the app
        if (typeof App !== 'undefined' && !App.isInitialized) {
            App.init();
        }
    },

    /**
     * Add a new user (for admin use in console)
     * Usage: Auth.addUser('username', 'password')
     */
    async addUser(username, password) {
        const hash = await this.hashPassword(password);
        console.log(`Add this to Auth.users:`);
        console.log(`'${username.toLowerCase()}': '${hash}'`);
        return hash;
    }
};

// Initialize auth when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});

// Expose Auth globally for logout button
window.Auth = Auth;

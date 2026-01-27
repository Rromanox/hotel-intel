# Mackinaw Intel - Hotel Rate Intelligence Platform

A professional hotel rate monitoring dashboard for Mackinaw City. Track your properties and competitors with real-time pricing data.

## 🚀 Quick Start

### Option 1: GitHub Pages (Frontend Only)

1. Upload all files to your GitHub repo
2. Enable GitHub Pages in Settings
3. Go to Settings page, enter your MakCorps API key
4. Click "Update Data" to fetch real rates

**⚠️ Note:** API key stored in browser only - won't work on other devices

### Option 2: With Render Backend (Recommended)

This keeps your API key secure and works on any device!

#### Step 1: Deploy Backend to Render

1. Create account at [render.com](https://render.com)
2. New → Web Service → Connect GitHub
3. Upload the `server/` folder or connect repo
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Add Environment Variable:
   - Key: `MAKCORPS_API_KEY`
   - Value: `your-actual-api-key`
6. Deploy!
7. Copy your Render URL (e.g., `https://mackinaw-intel.onrender.com`)

#### Step 2: Update Frontend Config

Edit `js/config.js`:
```javascript
api: {
    proxyUrl: 'https://YOUR-APP.onrender.com/api/city',
    mode: 'proxy',  // Change from 'direct' to 'proxy'
    ...
}
```

#### Step 3: Deploy Frontend to GitHub Pages

1. Upload files to GitHub
2. Enable Pages in Settings
3. Visit your site - it now uses the secure backend!

---

## 📊 API Usage

| Plan | Calls/Month | Quick Mode | Full Mode |
|------|-------------|------------|-----------|
| Free | 30 | ~30 dates | ~10 dates |
| Basic ($350) | 10,000 | All dates ✓ | All dates ✓ |
| Advance ($500) | 50,000 | Overkill | Overkill |

**Quick Mode (1 call/date):** Gets top 30 hotels - usually enough!
**Full Mode (3 calls/date):** Gets all ~64 hotels

---

## 📁 File Structure

```
hotel-intel-final/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── config.js      ← Your hotels & competitors
│   ├── api.js         ← API calls & smart limiting
│   ├── storage.js     ← localStorage handling
│   ├── charts.js      ← Chart.js visualizations
│   ├── ui.js          ← DOM interactions
│   └── app.js         ← Main application
├── server/            ← Deploy this to Render
│   ├── server.js
│   └── package.json
└── README.md
```

---

## 🔐 Security

| Method | API Key Location | Multi-Device |
|--------|------------------|--------------|
| Direct Mode | Browser localStorage | ❌ No |
| Proxy Mode | Render server | ✅ Yes |

**Recommendation:** Use Proxy Mode for security!

---

## 🛠️ Testing

Open browser console (F12) and run:

```javascript
// Test single date
API.testFetch('2026-05-15');

// Check API credits
API.checkAccount().then(console.log);

// Smart update (uses ~25 calls max)
App.performSmartUpdate();
```

---

## 💡 Tips

1. **Start with Free tier** to test everything works
2. **Use Quick Mode** - your hotels are likely in top 30
3. **Check credits** before large updates
4. **Data persists** in browser - no need to re-fetch daily

---

## 📞 Support

- MakCorps API Docs: https://docs.makcorps.com
- MakCorps Pricing: https://makcorps.com/#sectionPricing

---

Built for Mackinaw City hospitality 🌉

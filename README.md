# Mackinaw Intel - Hotel Rate Intelligence Platform

A professional-grade hotel rate intelligence dashboard for Mackinaw City tourism market analysis. Track competitor pricing, analyze market trends, and optimize your hotel rates with real-time data.

![Dashboard Preview](https://via.placeholder.com/800x400/1e3a8a/fbbf24?text=Mackinaw+Intel+Dashboard)

## 🚀 Features

### Dashboard
- **Real-time market overview** - Monitor 60+ Mackinaw City hotels
- **Your Properties spotlight** - Track Riviera Motel & American Boutique Inn
- **Key metrics cards** - Lowest, highest, average rates at a glance
- **Rate trend visualization** - 30-day moving averages with Chart.js
- **Activity feed** - Recent rate changes across the market

### Monthly Views
- **Interactive calendar** - Click any day to see all hotel rates
- **Daily rate breakdown** - Full hotel list sorted by price
- **Visual price indicators** - Average rates shown on each day
- **Month navigation** - May through September 2026

### Analytics Hub
- **Price distribution histogram** - See where rates cluster
- **Your Hotels vs Market comparison** - Side-by-side analysis
- **Market position tracking** - Your rank over time
- **Revenue Impact Calculator** - "What if" pricing scenarios

### Competitor Intelligence
- **Full market table** - All hotels with sortable columns
- **Advanced filters** - By price range, rating, or name
- **CSV export** - Download data for Excel analysis
- **Rate change tracking** - See who moved prices

### Additional Features
- ✅ Dark/Light theme toggle
- ✅ Mobile responsive design
- ✅ 15-day auto-update reminders
- ✅ Local storage persistence
- ✅ Offline capability with cached data

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (CSS Variables for theming), Vanilla JavaScript
- **Charts**: Chart.js for visualizations
- **Storage**: LocalStorage for data persistence
- **API**: MakCorp Hotel API integration
- **Hosting**: GitHub Pages ready

## 📦 Installation

### Option 1: GitHub Pages (Recommended)

1. Fork this repository
2. Enable GitHub Pages in repository settings
3. Access at `https://yourusername.github.io/hotel-intel/`

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/hotel-intel.git

# Navigate to directory
cd hotel-intel

# Open in browser (no build step required!)
open index.html
# or use a local server
python -m http.server 8000
```

## 📁 Project Structure

```
hotel-intel/
├── index.html          # Main HTML structure
├── css/
│   └── styles.css      # Complete stylesheet with themes
├── js/
│   ├── config.js       # API configuration & helpers
│   ├── storage.js      # LocalStorage operations
│   ├── api.js          # MakCorp API integration
│   ├── charts.js       # Chart.js visualizations
│   ├── ui.js           # DOM interactions
│   └── app.js          # Main application entry
├── data/               # JSON data storage (auto-generated)
└── README.md
```

## ⚙️ Configuration

Edit `js/config.js` to customize:

```javascript
const CONFIG = {
    api: {
        apiKey: 'YOUR_API_KEY',
        cityId: '42424',  // Mackinaw City
    },
    yourHotels: {
        'Riviera Motel': { id: 1162889 },
        'American Boutique Inn': { id: 564648 }
    },
    dateRange: {
        startMonth: 5,  // May
        startYear: 2026,
        monthsToCollect: 5  // May-September
    }
};
```

## 🔌 API Integration

The platform uses the MakCorp Hotel API:

```
GET https://api.makcorps.com/city?
    api_key={key}&
    cityid=42424&
    checkin=2026-05-15&
    checkout=2026-05-16&
    rooms=1&
    adults=2&
    cur=USD
```

**Note**: Demo data is automatically generated when the API is unavailable, allowing full platform testing without API access.

## 📊 Data Structure

```json
{
  "timestamp": "2026-01-27T13:59:00Z",
  "date": "2026-05-15",
  "hotels": [
    {
      "name": "American Boutique Inn",
      "hotelId": 564648,
      "price": 92,
      "vendor": "Booking.com",
      "rating": 4.0,
      "reviewCount": 323,
      "marketPosition": 15
    }
  ]
}
```

## 🎨 Design System

### Colors
- **Primary Navy**: `#1e3a8a`
- **Gold Accent**: `#fbbf24`
- **Success**: `#10b981`
- **Danger**: `#ef4444`

### Typography
- **Display**: Playfair Display (serif)
- **Body**: DM Sans (sans-serif)
- **Mono**: JetBrains Mono (monospace)

## 📈 Business Value

This platform transforms hotel operations from **reactive to proactive**:

| Benefit | Impact |
|---------|--------|
| Competitive Intelligence | Real-time market positioning |
| Revenue Optimization | Data-driven pricing decisions |
| Market Timing | Optimal rate release strategies |
| Historical Context | Long-term trend analysis |
| Operational Efficiency | Automated market monitoring |

**ROI Calculation**: Optimizing pricing by just $5/room/night across 50 rooms for 120 summer days = **$30,000 additional annual revenue**.

## 🔜 Roadmap

- [ ] Email/WhatsApp rate alerts
- [ ] AI-powered pricing recommendations
- [ ] Seasonal pattern detection
- [ ] Event impact tracking
- [ ] PDF report generation
- [ ] Multi-property portfolio support

## 📄 License

MIT License - feel free to use for your own properties!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Built with ❤️ for Mackinaw City hospitality**

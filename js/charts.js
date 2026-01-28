/**
 * Mackinaw Intel - Charts Module
 * Handles all Chart.js visualizations
 */

const Charts = {
    instances: {},

    /**
     * Initialize all charts
     */
    init() {
        this.setupChartDefaults();
    },

    /**
     * Set up Chart.js defaults
     */
    setupChartDefaults() {
        Chart.defaults.font.family = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";
        Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#64748b';
        Chart.defaults.plugins.legend.display = false;
    },

    /**
     * Update chart colors based on theme
     */
    updateTheme() {
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();

        Chart.defaults.color = textColor;

        // Update all chart instances
        Object.values(this.instances).forEach(chart => {
            if (chart && chart.options) {
                if (chart.options.scales) {
                    if (chart.options.scales.x) {
                        chart.options.scales.x.ticks.color = textColor;
                        chart.options.scales.x.grid.color = gridColor;
                    }
                    if (chart.options.scales.y) {
                        chart.options.scales.y.ticks.color = textColor;
                        chart.options.scales.y.grid.color = gridColor;
                    }
                }
                chart.update('none');
            }
        });
    },

    /**
     * Create the main rate trend chart
     */
    createRateTrendChart(ctx, data) {
        if (this.instances.rateTrend) {
            this.instances.rateTrend.destroy();
        }

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();

        this.instances.rateTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Your Properties Average',
                        data: data.yourHotels,
                        borderColor: CONFIG.chartColors.primary,
                        backgroundColor: 'rgba(251, 191, 36, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: CONFIG.chartColors.primary
                    },
                    {
                        label: 'Market Average',
                        data: data.marketAvg,
                        borderColor: CONFIG.chartColors.secondary,
                        backgroundColor: 'rgba(61, 90, 128, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        pointBackgroundColor: CONFIG.chartColors.secondary
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: $${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        },
                        ticks: {
                            color: textColor,
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        },
                        ticks: {
                            color: textColor,
                            callback: value => '$' + value
                        },
                        beginAtZero: false
                    }
                }
            }
        });

        return this.instances.rateTrend;
    },

    /**
     * Create price distribution histogram
     */
    createPriceDistributionChart(ctx, data) {
        if (this.instances.priceDistribution) {
            this.instances.priceDistribution.destroy();
        }

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();

        this.instances.priceDistribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Number of Hotels',
                    data: data.counts,
                    backgroundColor: data.labels.map((_, i) => {
                        // Highlight the bin containing your hotels (gold)
                        if (data.yourHotelBins && data.yourHotelBins.includes(i)) {
                            return CONFIG.chartColors.primary;
                        }
                        // Highlight bins with direct competitors (orange)
                        if (data.directCompBins && data.directCompBins.includes(i)) {
                            return CONFIG.chartColors.directCompetitor || '#f97316';
                        }
                        return CONFIG.chartColors.secondary;
                    }),
                    borderRadius: 6,
                    barPercentage: 0.85
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#cbd5e1',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            title: function(context) {
                                return `Price Range: ${context[0].label}`;
                            },
                            label: function(context) {
                                return `${context.raw} hotels`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: textColor
                        }
                    },
                    y: {
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        },
                        ticks: {
                            color: textColor,
                            stepSize: 1
                        },
                        beginAtZero: true
                    }
                }
            }
        });

        return this.instances.priceDistribution;
    },

    /**
     * Create comparison chart (your hotels vs market)
     */
    createComparisonChart(ctx, data) {
        if (this.instances.comparison) {
            this.instances.comparison.destroy();
        }

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();

        this.instances.comparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Your Hotels',
                        data: data.yourHotels,
                        backgroundColor: CONFIG.chartColors.primary,
                        borderRadius: 6,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Market Average',
                        data: data.marketAvg,
                        backgroundColor: CONFIG.chartColors.secondary,
                        borderRadius: 6,
                        barPercentage: 0.6
                    },
                    {
                        label: 'Market Low',
                        data: data.marketLow,
                        backgroundColor: CONFIG.chartColors.success,
                        borderRadius: 6,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            color: textColor
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#cbd5e1',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: $${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: textColor
                        }
                    },
                    y: {
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        },
                        ticks: {
                            color: textColor,
                            callback: value => '$' + value
                        },
                        beginAtZero: false
                    }
                }
            }
        });

        return this.instances.comparison;
    },

    /**
     * Create market position chart (line chart showing rank over time)
     */
    createPositionChart(ctx, data) {
        if (this.instances.position) {
            this.instances.position.destroy();
        }

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();

        this.instances.position = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Riviera Motel',
                        data: data.riviera,
                        borderColor: CONFIG.chartColors.primary,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'American Boutique Inn',
                        data: data.american,
                        borderColor: CONFIG.chartColors.success,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            color: textColor
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#cbd5e1',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: Rank #${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: textColor,
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        reverse: true, // Lower rank is better
                        grid: {
                            color: gridColor,
                            drawBorder: false
                        },
                        ticks: {
                            color: textColor,
                            stepSize: 5,
                            callback: value => '#' + value
                        },
                        min: 1
                    }
                }
            }
        });

        return this.instances.position;
    },

    /**
     * Prepare trend data from stored data
     */
    prepareTrendData(datesData, limit = 62) {
        const dates = Object.keys(datesData).sort();
        // Only show dates that have actual data
        const validDates = dates.filter(date => {
            const dateData = datesData[date];
            return dateData && dateData.hotels && dateData.hotels.length > 0;
        });
        
        const recentDates = validDates.slice(-limit);

        const labels = [];
        const yourHotels = [];
        const marketAvg = [];

        recentDates.forEach(date => {
            const dateData = datesData[date];
            if (!dateData || !dateData.hotels) return;

            // Format date label - show month/day
            const d = new Date(date + 'T00:00:00');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            labels.push(`${monthNames[d.getMonth()]} ${d.getDate()}`);

            // Calculate your hotels average
            const yourHotelData = dateData.hotels.filter(h => isYourHotel(h.name));
            const yourPrices = yourHotelData.map(h => h.price).filter(p => p > 0);
            const yourAvg = yourPrices.length > 0 
                ? Math.round(yourPrices.reduce((a, b) => a + b, 0) / yourPrices.length) 
                : null;
            yourHotels.push(yourAvg);

            // Calculate market average
            const allPrices = dateData.hotels.map(h => h.price).filter(p => p > 0);
            const mktAvg = allPrices.length > 0
                ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length)
                : null;
            marketAvg.push(mktAvg);
        });

        return { labels, yourHotels, marketAvg };
    },

    /**
     * Prepare price distribution data
     */
    prepareDistributionData(dateData) {
        if (!dateData || !dateData.hotels) {
            return { labels: [], counts: [], yourHotelBins: [] };
        }

        const prices = dateData.hotels.map(h => h.price).filter(p => p > 0);
        if (prices.length === 0) {
            return { labels: [], counts: [], yourHotelBins: [] };
        }

        // Create price bins ($25 increments)
        const minPrice = Math.floor(Math.min(...prices) / 25) * 25;
        const maxPrice = Math.ceil(Math.max(...prices) / 25) * 25;
        
        const bins = [];
        for (let p = minPrice; p < maxPrice; p += 25) {
            bins.push({ min: p, max: p + 25, count: 0 });
        }

        // Count hotels in each bin
        prices.forEach(price => {
            const binIndex = bins.findIndex(b => price >= b.min && price < b.max);
            if (binIndex !== -1) {
                bins[binIndex].count++;
            }
        });

        // Find bins containing your hotels
        const yourHotelPrices = dateData.hotels
            .filter(h => isYourHotel(h.name))
            .map(h => h.price);
        
        const yourHotelBins = [];
        yourHotelPrices.forEach(price => {
            const binIndex = bins.findIndex(b => price >= b.min && price < b.max);
            if (binIndex !== -1 && !yourHotelBins.includes(binIndex)) {
                yourHotelBins.push(binIndex);
            }
        });

        return {
            labels: bins.map(b => `$${b.min}-$${b.max}`),
            counts: bins.map(b => b.count),
            yourHotelBins
        };
    },

    /**
     * Prepare comparison data
     */
    prepareComparisonData(datesData, limit = 31) {
        const dates = Object.keys(datesData).sort();
        const recentDates = limit ? dates.slice(-limit) : dates;

        const labels = [];
        const yourHotels = [];
        const marketAvg = [];
        const marketLow = [];

        recentDates.forEach(date => {
            const dateData = datesData[date];
            if (!dateData || !dateData.hotels) return;

            const d = new Date(date + 'T00:00:00');
            labels.push(`${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getDate()}`);

            // Your hotels average
            const yourHotelData = dateData.hotels.filter(h => isYourHotel(h.name));
            const yourPrices = yourHotelData.map(h => h.price).filter(p => p > 0);
            yourHotels.push(yourPrices.length > 0 
                ? Math.round(yourPrices.reduce((a, b) => a + b, 0) / yourPrices.length) 
                : null);

            // Market stats
            const allPrices = dateData.hotels.map(h => h.price).filter(p => p > 0);
            marketAvg.push(allPrices.length > 0
                ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length)
                : null);
            marketLow.push(allPrices.length > 0 ? Math.min(...allPrices) : null);
        });

        return { labels, yourHotels, marketAvg, marketLow };
    },

    /**
     * Prepare position data
     */
    preparePositionData(datesData, limit = 31) {
        const dates = Object.keys(datesData).sort();
        const recentDates = limit ? dates.slice(-limit) : dates;

        const labels = [];
        const riviera = [];
        const american = [];

        recentDates.forEach(date => {
            const dateData = datesData[date];
            if (!dateData || !dateData.hotels) return;

            const d = new Date(date + 'T00:00:00');
            labels.push(`${d.getMonth() + 1}/${d.getDate()}`);

            // Sort hotels by price to get ranks
            const sortedHotels = [...dateData.hotels]
                .filter(h => h.price && h.price > 0)
                .sort((a, b) => a.price - b.price);

            // Find rank of each hotel
            const rivieraHotel = sortedHotels.findIndex(h => 
                h.name && h.name.toLowerCase().includes('riviera'));
            const americanHotel = sortedHotels.findIndex(h => 
                h.name && h.name.toLowerCase().includes('american boutique'));

            riviera.push(rivieraHotel !== -1 ? rivieraHotel + 1 : null);
            american.push(americanHotel !== -1 ? americanHotel + 1 : null);
        });

        return { labels, riviera, american };
    },

    /**
     * Destroy all chart instances
     */
    destroyAll() {
        Object.values(this.instances).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.instances = {};
    }
};

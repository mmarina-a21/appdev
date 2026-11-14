// Health Risk Factors Dashboard
// Data source: tries the PHP + MySQL API first (api.php).
// If that is not available (for example on static hosting), it falls back
// to reading the CSV file directly in the browser with PapaParse.

document.addEventListener('DOMContentLoaded', function () {
    let riskFactors = [];
    let lineChart, barChart, map, geoJsonLayer, countryGeoJSON;

    // Columns that are not risk factors
    const NON_FACTOR_KEYS = ['id', 'entity', 'year'];

    // GeoJSON country names that are spelled differently in the dataset
    const GEO_NAME_TO_DATA_NAME = {
        'United States of America': 'United States',
        'United Republic of Tanzania': 'Tanzania',
        'Democratic Republic of the Congo': 'Democratic Republic of Congo',
        'Republic of the Congo': 'Congo',
        'Czech Republic': 'Czechia',
        'Republic of Serbia': 'Serbia',
        'The Bahamas': 'Bahamas',
        'Ivory Coast': "Cote d'Ivoire",
        'Guinea Bissau': 'Guinea-Bissau',
        'East Timor': 'Timor',
        'Swaziland': 'Eswatini',
        'Macedonia': 'North Macedonia',
        'West Bank': 'Palestine'
    };

    function dataNameFor(geoName) {
        return GEO_NAME_TO_DATA_NAME[geoName] || geoName;
    }

    // Turn a CSV header like "High body-mass index" into "high_body_mass_index",
    // so CSV rows have the same keys as rows from the database.
    function toColumnName(header) {
        return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    }

    function prettyLabel(key) {
        const text = key.replace(/_/g, ' ');
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    // Load rows from the PHP API. Rejects if the API is missing or returns non-JSON.
    function loadFromApi() {
        return fetch('api.php')
            .then(response => {
                if (!response.ok) throw new Error('API returned ' + response.status);
                return response.json();
            })
            .then(rows => {
                if (!Array.isArray(rows) || rows.length === 0) throw new Error('API returned no rows');
                return rows;
            });
    }

    // Load rows straight from the CSV file.
    function loadFromCsv() {
        return new Promise((resolve, reject) => {
            Papa.parse('number-of-deaths-by-risk-factor.csv', {
                download: true,
                header: true,
                skipEmptyLines: true,
                transformHeader: toColumnName,
                complete: results => resolve(results.data),
                error: reject
            });
        });
    }

    function loadData() {
        return loadFromApi().catch(error => {
            console.info('API not available, reading the CSV instead:', error.message);
            return loadFromCsv();
        });
    }

    function loadGeoJson() {
        return fetch('countries.geo.json').then(response => response.json());
    }

    function processData(data) {
        const years = [...new Set(data.map(item => String(item.year)))].sort();
        const countries = [...new Set(data.map(item => item.entity))].sort();
        riskFactors = Object.keys(data[0]).filter(key => !NON_FACTOR_KEYS.includes(key));
        return { years, countries, data };
    }

    function fillSelect(select, values, labelFn) {
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.text = labelFn ? labelFn(value) : value;
            select.appendChild(option);
        });
    }

    function makeChart(context, type) {
        return new Chart(context, {
            type: type,
            data: { labels: [], datasets: [] },
            options: {
                scales: {
                    x: { ticks: { color: '#e0e0e0' }, grid: { color: '#444' } },
                    y: { ticks: { color: '#e0e0e0' }, grid: { color: '#444' } }
                },
                plugins: { legend: { labels: { color: '#e0e0e0' } } }
            }
        });
    }

    function updateCharts(data, selectedYear, selectedCountry) {
        const row = data.find(item => String(item.year) === String(selectedYear) && item.entity === selectedCountry);
        if (!row) {
            console.error('No data for', selectedCountry, selectedYear);
            return;
        }
        const datasets = [{
            label: selectedCountry + ' (' + selectedYear + ')',
            data: riskFactors.map(factor => parseFloat(row[factor])),
            borderColor: '#ffe1ff',
            backgroundColor: '#ffe1ff',
            fill: false
        }];
        const labels = riskFactors.map(prettyLabel);

        [lineChart, barChart].forEach(chart => {
            chart.data.labels = labels;
            chart.data.datasets = datasets;
            chart.update();
        });
    }

    function updateMap(data, selectedYear, selectedRiskFactor) {
        const rowsForYear = data.filter(item => String(item.year) === String(selectedYear));
        const byCountry = new Map(rowsForYear.map(item => [item.entity, parseFloat(item[selectedRiskFactor])]));
        // Scale colours using only countries drawn on the map,
        // so totals like "World" or regions don't wash the map out.
        const mapValues = countryGeoJSON.features
            .map(feature => byCountry.get(dataNameFor(feature.properties.name)))
            .filter(value => value !== undefined && !isNaN(value));
        const maxDeaths = Math.max(...mapValues);
        const colorScale = chroma.scale(['pink', 'magenta', 'red']).domain([0, maxDeaths]);

        if (geoJsonLayer) map.removeLayer(geoJsonLayer);

        geoJsonLayer = L.geoJSON(countryGeoJSON, {
            style: feature => {
                const deaths = byCountry.get(dataNameFor(feature.properties.name));
                return {
                    fillColor: deaths === undefined ? '#555' : colorScale(deaths).hex(),
                    fillOpacity: 0.7,
                    color: '#000',
                    weight: 1
                };
            },
            onEachFeature: (feature, layer) => {
                const deaths = byCountry.get(dataNameFor(feature.properties.name));
                const text = deaths === undefined ? 'No data' : Math.round(deaths).toLocaleString() + ' deaths';
                layer.bindTooltip('<strong>' + feature.properties.name + '</strong><br>' + text);
            }
        }).addTo(map);
    }

    // Wait for both the map shapes and the data before drawing anything.
    Promise.all([loadGeoJson(), loadData()])
        .then(([geojson, rawData]) => {
            countryGeoJSON = geojson;
            map = L.map('mapContainer').setView([20, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            const { years, countries, data } = processData(rawData);

            const yearSelect = document.getElementById('yearSelect');
            const countrySelect = document.getElementById('countrySelect');
            const riskFactorSelect = document.getElementById('riskFactorSelect');

            fillSelect(yearSelect, years);
            fillSelect(countrySelect, countries);
            fillSelect(riskFactorSelect, riskFactors, prettyLabel);

            lineChart = makeChart(document.getElementById('lineChart').getContext('2d'), 'line');
            barChart = makeChart(document.getElementById('barChart').getContext('2d'), 'bar');

            updateCharts(data, yearSelect.value, countrySelect.value);
            updateMap(data, yearSelect.value, riskFactorSelect.value);

            yearSelect.addEventListener('change', () => {
                updateCharts(data, yearSelect.value, countrySelect.value);
                updateMap(data, yearSelect.value, riskFactorSelect.value);
            });
            countrySelect.addEventListener('change', () => {
                updateCharts(data, yearSelect.value, countrySelect.value);
            });
            riskFactorSelect.addEventListener('change', () => {
                updateMap(data, yearSelect.value, riskFactorSelect.value);
            });
        })
        .catch(error => console.error('Could not load the dashboard data:', error));
});

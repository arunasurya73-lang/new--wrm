import { generate24HourTrend, generate7DayForecast, getAQIInfo } from './stationData.js';

export class ForecastCharts {
  constructor(canvas24hId = 'chart-24h', canvas7dId = 'chart-7d', canvasRadarId = 'chart-radar') {
    this.canvas24hId = canvas24hId;
    this.canvas7dId = canvas7dId;
    this.canvasRadarId = canvasRadarId;
    this.chart24h = null;
    this.chart7d = null;
    this.chartRadar = null;
  }

  getCanvas(id) {
    return document.getElementById(id);
  }

  updateCharts(station) {
    if (!station) return;
    if (!window.Chart) {
      console.warn('Chart.js not yet loaded, retrying in 250ms...');
      setTimeout(() => this.updateCharts(station), 250);
      return;
    }

    this.render24HourChart(station);
    this.render7DayChart(station);
    this.renderRadarChart(station);
  }

  render24HourChart(station) {
    const canvas = this.getCanvas(this.canvas24hId);
    if (!canvas) return;
    const trendData = generate24HourTrend(station.aqi);
    const ctx = canvas.getContext('2d');
    const isDark = !document.documentElement.classList.contains('light');
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    if (this.chart24h) {
      this.chart24h.destroy();
    }

    // Dynamic Gradient Fill
    const gradientAqi = ctx.createLinearGradient(0, 0, 0, 300);
    gradientAqi.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
    gradientAqi.addColorStop(0.5, 'rgba(249, 115, 22, 0.25)');
    gradientAqi.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const datasets = [
      {
        label: 'AQI Level',
        data: trendData.aqi,
        borderColor: '#F97316',
        backgroundColor: gradientAqi,
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#F97316'
      },
      {
        label: 'PM2.5 (µg/m³)',
        data: trendData.pm25,
        borderColor: '#A855F7',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#A855F7'
      },
      {
        label: 'Stubble Smoke Share (%)',
        data: trendData.stubble,
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
        borderWidth: 1.8,
        tension: 0.3,
        yAxisID: 'y1',
        pointRadius: 0
      }
    ];

    this.chart24h = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trendData.labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: textColor,
              usePointStyle: true,
              boxWidth: 8,
              font: { family: 'Inter', size: 12 }
            }
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: isDark ? '#F8FAFC' : '#0F172A',
            bodyColor: isDark ? '#CBD5E1' : '#334155',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                  label += context.parsed.y;
                  if (context.dataset.yAxisID === 'y1') label += '%';
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              maxRotation: 0,
              font: { family: 'Inter', size: 11 },
              maxTicksLimit: 8
            }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
            title: { display: true, text: 'AQI / PM2.5 Level', color: textColor, font: { size: 11 } }
          },
          y1: {
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              color: '#EF4444',
              callback: (val) => val + '%',
              font: { family: 'Inter', size: 10 }
            },
            title: { display: true, text: 'Smoke Share %', color: '#EF4444', font: { size: 10 } }
          }
        }
      }
    });
  }

  render7DayChart(station) {
    const canvas = this.getCanvas(this.canvas7dId);
    if (!canvas) return;
    const forecast = generate7DayForecast(station.aqi);
    const ctx = canvas.getContext('2d');
    const isDark = !document.documentElement.classList.contains('light');
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    if (this.chart7d) {
      this.chart7d.destroy();
    }

    const barColors = forecast.avg.map(val => getAQIInfo(val).color);

    this.chart7d = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: forecast.labels,
        datasets: [{
          label: 'Expected AQI',
          data: forecast.avg,
          backgroundColor: barColors,
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 36
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: isDark ? '#F8FAFC' : '#0F172A',
            bodyColor: isDark ? '#CBD5E1' : '#334155',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (context) => {
                const aqi = context.parsed.y;
                const info = getAQIInfo(aqi);
                return `AQI: ${aqi} (${info.label})`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'Inter', size: 12, weight: 600 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
            title: { display: true, text: 'Forecast AQI', color: textColor, font: { size: 11 } }
          }
        }
      }
    });
  }

  renderRadarChart(station) {
    const canvas = this.getCanvas(this.canvasRadarId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const isDark = !document.documentElement.classList.contains('light');
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    if (this.chartRadar) {
      this.chartRadar.destroy();
    }

    // Normalized against safe standard baseline (100 = safety limit)
    const normPm25 = Math.min(500, Math.round((station.pm25 / 60) * 100));
    const normPm10 = Math.min(500, Math.round((station.pm10 / 100) * 100));
    const normNo2 = Math.min(500, Math.round((station.no2 / 80) * 100));
    const normSo2 = Math.min(500, Math.round((station.so2 / 80) * 100));
    const normCo = Math.min(500, Math.round((station.co / 2.0) * 100));
    const normO3 = Math.min(500, Math.round((station.o3 / 100) * 100));

    this.chartRadar = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['PM2.5 (Fine)', 'PM10 (Coarse)', 'NO₂ (Traffic)', 'SO₂ (Industrial)', 'CO (Combustion)', 'O₃ (Photochemical)'],
        datasets: [
          {
            label: `${station.name} Severity Ratio`,
            data: [normPm25, normPm10, normNo2, normSo2, normCo, normO3],
            backgroundColor: 'rgba(239, 68, 68, 0.35)',
            borderColor: '#EF4444',
            borderWidth: 2,
            pointBackgroundColor: '#EF4444',
            pointRadius: 3
          },
          {
            label: 'WHO Safe Standard (100%)',
            data: [100, 100, 100, 100, 100, 100],
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderColor: '#10B981',
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: textColor, font: { family: 'Inter', size: 11 }, usePointStyle: true }
          }
        },
        scales: {
          r: {
            angleLines: { color: gridColor },
            grid: { color: gridColor },
            pointLabels: { color: textColor, font: { family: 'Inter', size: 10, weight: 600 } },
            ticks: { display: false }
          }
        }
      }
    });
  }
}

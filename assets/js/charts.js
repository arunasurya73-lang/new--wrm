import { generate72HourTrend, generate24HourTrend, generate7DayForecast, getAQIInfo } from './stationData.js';

export class ForecastCharts {
  constructor(canvas72hMultiId = 'chart-24h', canvas7dId = 'chart-7d', canvasRadarId = 'chart-radar', canvasPblId = 'chart-pbl-inversion') {
    this.canvas72hMultiId = canvas72hMultiId;
    this.canvas7dId = canvas7dId;
    this.canvasRadarId = canvasRadarId;
    this.canvasPblId = canvasPblId;
    this.chart72hMulti = null;
    this.chart7d = null;
    this.chartRadar = null;
    this.chartPbl = null;
  }

  getCanvas(id) {
    return document.getElementById(id);
  }

  updateCharts(station, profileData = null) {
    if (!station) return;
    if (!window.Chart) {
      console.warn('Chart.js not yet loaded, retrying in 250ms...');
      setTimeout(() => this.updateCharts(station, profileData), 250);
      return;
    }

    this.render72HourMultiPollutantChart(station, profileData);
    this.render72HourForecastChart(station, profileData);
    this.renderRadarChart(station);
    if (profileData) {
      this.renderPblInversionChart(profileData);
    }
  }

  render72HourMultiPollutantChart(station, profileData = null) {
    const canvas = this.getCanvas(this.canvas72hMultiId);
    if (!canvas) return;
    const trendData = generate72HourTrend(station.aqi, station.pm25, station.pm10, profileData);
    const ctx = canvas.getContext('2d');
    const isDark = !document.documentElement.classList.contains('light');
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    if (this.chart72hMulti) {
      this.chart72hMulti.destroy();
    }

    // Dynamic Gradient Fill
    const gradientAqi = ctx.createLinearGradient(0, 0, 0, 300);
    gradientAqi.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
    gradientAqi.addColorStop(0.5, 'rgba(249, 115, 22, 0.18)');
    gradientAqi.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const datasets = [
      {
        label: 'PM2.5 (µg/m³)',
        data: trendData.pm25,
        borderColor: '#A855F7',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2.2,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#A855F7'
      },
      {
        label: 'PM10 (µg/m³)',
        data: trendData.pm10,
        borderColor: '#38BDF8',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [4, 4],
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#38BDF8'
      },
      {
        label: 'Stubble Smoke Share (%)',
        data: trendData.stubble,
        borderColor: '#EF4444',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y1',
        pointRadius: 0,
        pointHoverRadius: 5
      }
    ];

    this.chart72hMulti = new Chart(ctx, {
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
              font: { family: 'Inter', size: 11 }
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
                  else label += ' µg/m³';
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
              font: { family: 'Inter', size: 10 },
              maxTicksLimit: 10
            }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
            title: { display: true, text: 'Particulate Concentration (µg/m³)', color: textColor, font: { size: 11 } }
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

  // -------------------------------------------------------------
  // 72-Hour Coupled AQI Forecast with Inversion-Driven Uncertainty Band
  // -------------------------------------------------------------
  render72HourForecastChart(station, profileData = null) {
    const canvas = this.getCanvas(this.canvas7dId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const isDark = !document.documentElement.classList.contains('light');
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    if (this.chart7d) {
      this.chart7d.destroy();
    }

    const count = 72;
    const labels = [];
    const meanAqi = [];
    const upperConfidence = [];
    const lowerConfidence = [];
    const invData = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const t = new Date(now.getTime() + i * 3600 * 1000);
      const hour = t.getHours();
      // Sampling every 3 hours for cleaner x-axis labels
      const labelStr = (i % 6 === 0 || i === 0) 
        ? `${t.toLocaleDateString('en-IN', { weekday: 'short' })} ${hour.toString().padStart(2, '0')}:00`
        : `${hour.toString().padStart(2, '0')}:00`;
      labels.push(labelStr);

      const invVal = (profileData && profileData.inversionIndices && profileData.inversionIndices[i] !== undefined)
        ? profileData.inversionIndices[i]
        : ((hour >= 20 || hour <= 8) ? 1.4 : -2.5);
      invData.push(invVal);

      // Baseline projection
      let diurnal = 1.0;
      if (hour >= 6 && hour <= 9) diurnal = 1.25;
      else if (hour >= 20 && hour <= 23) diurnal = 1.22;
      else if (hour >= 13 && hour <= 16) diurnal = 0.82;

      // Inversion impact on mean forecast
      const invImpact = invVal > 0 ? (invVal * 12) : (invVal * 5);
      const baseProjected = Math.round(Math.max(25, Math.min(480, (station.aqi * diurnal * 0.9) + invImpact + (Math.sin(i / 4) * 8))));
      meanAqi.push(baseProjected);

      // Uncertainty band widens significantly during strong inversion (thermal cap volatility)
      const uncertaintyDelta = invVal >= 0 
        ? Math.round(35 + (invVal * 16) + (i * 0.4))  // Widened band when inversion traps pollutants
        : Math.round(15 + (i * 0.3));                  // Narrow band under clean convective mixing

      upperConfidence.push(Math.min(500, baseProjected + uncertaintyDelta));
      lowerConfidence.push(Math.max(20, baseProjected - Math.round(uncertaintyDelta * 0.85)));
    }

    this.chart7d = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Upper Bound (Inversion Uncertainty)',
            data: upperConfidence,
            borderColor: 'rgba(249, 115, 22, 0.35)',
            borderWidth: 1,
            borderDash: [3, 3],
            fill: '+1', // Fill down to lower bound
            backgroundColor: 'rgba(249, 115, 22, 0.12)',
            pointRadius: 0
          },
          {
            label: 'Lower Bound',
            data: lowerConfidence,
            borderColor: 'rgba(249, 115, 22, 0.35)',
            borderWidth: 1,
            borderDash: [3, 3],
            fill: false,
            pointRadius: 0
          },
          {
            label: 'Projected AQI Mean',
            data: meanAqi,
            borderColor: '#F97316',
            backgroundColor: 'transparent',
            borderWidth: 2.6,
            tension: 0.3,
            pointRadius: (ctx) => (ctx.dataIndex % 6 === 0 ? 3 : 0),
            pointBackgroundColor: '#F97316'
          },
          {
            label: 'Inversion ΔT (°C)',
            data: invData,
            borderColor: '#06B6D4',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [4, 4],
            tension: 0.3,
            yAxisID: 'y1',
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: textColor, font: { family: 'Inter', size: 11 }, usePointStyle: true, boxWidth: 6 }
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)',
            titleColor: isDark ? '#F8FAFC' : '#0F172A',
            bodyColor: isDark ? '#CBD5E1' : '#334155',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                if (context.datasetIndex === 2) {
                  const val = context.parsed.y;
                  return `Projected AQI: ${val} (${getAQIInfo(val).label})`;
                }
                if (context.datasetIndex === 3) {
                  return `Inversion ΔT: ${context.parsed.y > 0 ? '+' : ''}${context.parsed.y} °C`;
                }
                if (context.datasetIndex === 0) {
                  return `Upper Limit: ${context.parsed.y} AQI`;
                }
                if (context.datasetIndex === 1) {
                  return `Lower Limit: ${context.parsed.y} AQI`;
                }
                return `${context.dataset.label}: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, maxTicksLimit: 12, maxRotation: 0, font: { family: 'Inter', size: 10.5 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Inter', size: 10.5 } },
            title: { display: true, text: 'Coupled 72h AQI Level', color: textColor, font: { size: 10.5 } },
            min: 0,
            max: 500
          },
          y1: {
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#06B6D4', callback: (v) => `${v > 0 ? '+' : ''}${v}°C`, font: { size: 10 } },
            title: { display: true, text: '850hPa - 2m ΔT', color: '#06B6D4', font: { size: 10 } }
          }
        }
      }
    });
  }

  // -------------------------------------------------------------
  // Boundary Layer Height (PBL) & Trapping Threshold Panel Chart
  // -------------------------------------------------------------
  renderPblInversionChart(profileData) {
    const canvas = this.getCanvas(this.canvasPblId);
    if (!canvas || !profileData) return;
    const ctx = canvas.getContext('2d');
    const isDark = !document.documentElement.classList.contains('light');
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    if (this.chartPbl) {
      this.chartPbl.destroy();
    }

    const count = Math.min(72, profileData.labels.length);
    const pblData = profileData.pblHeights.slice(0, count);
    const invData = profileData.inversionIndices.slice(0, count);
    const thresholdData = new Array(count).fill(500); // 500m trapping limit

    const pblGradient = ctx.createLinearGradient(0, 0, 0, 220);
    pblGradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    pblGradient.addColorStop(1, 'rgba(6, 182, 212, 0.02)');

    this.chartPbl = new Chart(ctx, {
      type: 'line',
      data: {
        labels: profileData.labels.slice(0, count),
        datasets: [
          {
            label: 'Boundary Layer Height (PBL)',
            data: pblData,
            borderColor: '#06B6D4',
            backgroundColor: pblGradient,
            borderWidth: 2.2,
            fill: true,
            tension: 0.35,
            pointRadius: (c) => (c.dataIndex % 6 === 0 ? 3 : 0),
            pointBackgroundColor: '#06B6D4'
          },
          {
            label: 'Trapping Risk Threshold (500m)',
            data: thresholdData,
            borderColor: '#EF4444',
            borderWidth: 1.8,
            borderDash: [5, 4],
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Inversion Index (850hPa - 2m ΔT)',
            data: invData,
            borderColor: '#F59E0B',
            borderWidth: 1.6,
            borderDash: [3, 3],
            yAxisID: 'y1',
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: textColor, font: { family: 'Inter', size: 11 }, usePointStyle: true, boxWidth: 6 }
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)',
            titleColor: isDark ? '#F8FAFC' : '#0F172A',
            bodyColor: isDark ? '#CBD5E1' : '#334155',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                if (context.datasetIndex === 0) {
                  const m = context.parsed.y;
                  return `Mixing Layer Height: ${m}m ${m < 500 ? '⚠️ (Trapping Risk)' : '✅ (Good Mixing)'}`;
                }
                if (context.datasetIndex === 2) {
                  return `Inversion ΔT: ${context.parsed.y > 0 ? '+' : ''}${context.parsed.y} °C`;
                }
                return `${context.dataset.label}: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, maxTicksLimit: 12, maxRotation: 0, font: { family: 'Inter', size: 10.5 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, callback: (v) => `${v}m`, font: { family: 'Inter', size: 10.5 } },
            title: { display: true, text: 'Planetary Boundary Layer (PBL)', color: textColor, font: { size: 10.5 } },
            min: 0
          },
          y1: {
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#F59E0B', callback: (v) => `${v > 0 ? '+' : ''}${v}°C`, font: { size: 10 } },
            title: { display: true, text: 'Inversion ΔT', color: '#F59E0B', font: { size: 10 } }
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

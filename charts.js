document.addEventListener('DOMContentLoaded', () => {
  let expensesChart = null;
  let projectionChart = null;
  let projectionYears = 5; // default projection years

  // Helper: Get theme-specific colors
  function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: isDark ? '#b69fa2' : '#745c60',
      grid: isDark ? '#361f23' : '#e8deda',
      maroon: isDark ? '#b3002d' : '#800020',
      gold: isDark ? '#f3cd4c' : '#d4af37',
      goldGlow: isDark ? 'rgba(243, 205, 76, 0.2)' : 'rgba(212, 175, 55, 0.1)',
      maroonGlow: isDark ? 'rgba(179, 0, 45, 0.2)' : 'rgba(128, 0, 32, 0.05)',
      
      // Chart colors palette matching maroon and gold
      palette: [
        isDark ? '#b3002d' : '#800020', // Maroon
        isDark ? '#f3cd4c' : '#d4af37', // Gold
        isDark ? '#d60036' : '#a30029', // Mid Maroon/Red
        isDark ? '#ffd966' : '#e5c05c', // Light Gold
        isDark ? '#846e71' : '#a08c90', // Greyish Maroon
        isDark ? '#4a111a' : '#5d0016', // Dark Maroon
        isDark ? '#ab9598' : '#745c60', // Darker Greyish
        isDark ? '#ffe082' : '#f5be41'  // Pale Gold
      ]
    };
  }

  // ==============================================
  // 1. EXPENSES BREAKDOWN CHART
  // ==============================================
  function drawExpensesChart() {
    const canvas = document.getElementById('expensesChart');
    if (!canvas) return;

    const expenses = window.getExpenses ? window.getExpenses() : [];
    const colors = getThemeColors();

    // Group expenses by category
    const categories = {
      housing: 0,
      groceries: 0,
      utilities: 0,
      entertainment: 0,
      lic: 0,
      health: 0,
      travel: 0,
      extra: 0,
      miscellaneous: 0
    };

    let total = 0;
    expenses.forEach(exp => {
      const amt = parseFloat(exp.amount) || 0;
      if (categories[exp.category] !== undefined) {
        categories[exp.category] += amt;
        total += amt;
      } else {
        categories.miscellaneous += amt;
        total += amt;
      }
    });

    // Prepare data
    const labels = [];
    const data = [];
    const backgroundColors = [];

    // Map categories to user-friendly titles and colors
    const categoryConfigs = {
      housing: { label: 'Housing/Rent', color: colors.palette[0] },
      groceries: { label: 'Groceries/Food', color: colors.palette[2] },
      utilities: { label: 'Utilities/Bills', color: colors.palette[4] },
      entertainment: { label: 'Entertainment', color: colors.palette[1] },
      lic: { label: 'LIC/Insurance', color: colors.palette[3] },
      health: { label: 'Health & Medical', color: colors.palette[7] },
      travel: { label: 'Travel/Commute', color: colors.palette[6] },
      extra: { label: 'Extra/Splurge', color: colors.palette[5] },
      miscellaneous: { label: 'Miscellaneous', color: '#888888' }
    };

    Object.keys(categories).forEach(cat => {
      if (categories[cat] > 0) {
        labels.push(categoryConfigs[cat].label);
        data.push(categories[cat]);
        backgroundColors.push(categoryConfigs[cat].color);
      }
    });

    // If no expenses, show placeholder
    if (total === 0) {
      labels.push('No Expenses Logged');
      data.push(1);
      backgroundColors.push(colors.grid);
    }

    if (expensesChart) {
      expensesChart.destroy();
    }

    // Render Doughnut Chart
    expensesChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: document.documentElement.getAttribute('data-theme') === 'dark' ? 2 : 1,
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1a0c0f' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: colors.text,
              font: {
                family: 'Inter',
                size: 11
              },
              padding: 15,
              usePointStyle: true
            }
          },
          tooltip: {
            enabled: total > 0,
            callbacks: {
              label: function(context) {
                const val = context.raw;
                const pct = ((val / total) * 100).toFixed(1);
                return ` ${context.label}: ₹${val.toLocaleString('en-IN')} (${pct}%)`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  // ==============================================
  // 2. WEALTH PROJECTION CHART
  // ==============================================
  function drawProjectionChart() {
    const canvas = document.getElementById('projectionChart');
    if (!canvas) return;

    const investments = window.getInvestments ? window.getInvestments() : [];
    const colors = getThemeColors();
    
    const labels = [];
    const totalWealthData = [];
    const principalData = [];
    
    // Project wealth year by year
    for (let y = 0; y <= projectionYears; y++) {
      labels.push(`Year ${y}`);
      let totalPortfolioVal = 0;
      let totalPrincipalVal = 0;

      investments.forEach(inv => {
        // Current value of this asset today (elapsed time from start to today)
        const currentVals = window.calculateInvestmentValue(inv);
        let assetPrincipal = currentVals.principal;
        let assetVal = currentVals.currentValue;

        if (y > 0) {
          const r = parseFloat(inv.rate) / 100;
          const monthlyRate = r / 12;
          const principalInput = parseFloat(inv.amount);
          
          switch (inv.type) {
            case 'sip': {
              // SIP continues for remaining duration
              const elapsedMonths = currentVals.elapsedMonths;
              const remainingMonths = Math.max(0, (inv.duration * 12) - elapsedMonths);
              const projectionMonths = y * 12;
              
              // Months of future contributions we will make in the next y years
              const activeContribMonths = Math.min(remainingMonths, projectionMonths);
              // Months that will compound as a lump sum after contributions stop
              const compoundingOnlyMonths = Math.max(0, projectionMonths - activeContribMonths);

              // 1. Grow current value as a lump sum for y years
              let futVal = assetVal * Math.pow(1 + monthlyRate, projectionMonths);

              // 2. Add future contributions (SIP future value compounding from their start date)
              if (activeContribMonths > 0) {
                let futureContribVal = principalInput * ((Math.pow(1 + monthlyRate, activeContribMonths) - 1) / monthlyRate) * (1 + monthlyRate);
                // Compound those contributions for any remaining months in the projection timeline
                if (compoundingOnlyMonths > 0) {
                  futureContribVal = futureContribVal * Math.pow(1 + monthlyRate, compoundingOnlyMonths);
                }
                futVal += futureContribVal;
              }

              assetVal = futVal;
              assetPrincipal += principalInput * activeContribMonths;
              break;
            }

            case 'lump-sum':
            case 'stocks': {
              // One-time investment compounding from today for y years
              const n = parseInt(inv.compounding) || 12;
              if (n === 0) {
                // Simple Interest
                assetVal = assetVal + (currentVals.principal * r * y);
              } else {
                assetVal = assetVal * Math.pow(1 + r/n, n * y);
              }
              // Principal remains constant for one-time investments
              break;
            }

            case 'lic': {
              // LIC Premium additions
              let freqMonths = 12;
              if (inv.licPremiumFreq === 'half-yearly') freqMonths = 6;
              if (inv.licPremiumFreq === 'quarterly') freqMonths = 3;
              if (inv.licPremiumFreq === 'monthly') freqMonths = 1;

              const elapsedMonths = currentVals.elapsedMonths;
              const remainingMonths = Math.max(0, (inv.duration * 12) - elapsedMonths);
              const projectionMonths = y * 12;
              
              // Future payments in the next y years
              const activeMonths = Math.min(remainingMonths, projectionMonths);
              const futurePaymentsCount = Math.floor(activeMonths / freqMonths);

              // 1. Compound current value annually
              let futVal = assetVal * Math.pow(1 + r, y);

              // 2. Accumulate future premium payments
              for (let i = 1; i <= futurePaymentsCount; i++) {
                const monthsSincePayment = projectionMonths - (i * freqMonths);
                const yearsSincePayment = monthsSincePayment / 12;
                futVal += principalInput * Math.pow(1 + r, yearsSincePayment);
              }

              assetVal = futVal;
              assetPrincipal += principalInput * futurePaymentsCount;
              break;
            }
          }
        }

        totalPortfolioVal += assetVal;
        totalPrincipalVal += assetPrincipal;
      });

      totalWealthData.push(Math.round(totalPortfolioVal));
      principalData.push(Math.round(totalPrincipalVal));
    }

    if (projectionChart) {
      projectionChart.destroy();
    }

    // Render Line Chart
    projectionChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Projected Value',
            data: totalWealthData,
            borderColor: colors.gold,
            backgroundColor: colors.goldGlow,
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: colors.gold,
            pointHoverRadius: 7
          },
          {
            label: 'Principal Invested',
            data: principalData,
            borderColor: colors.maroon,
            backgroundColor: colors.maroonGlow,
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.1,
            pointBackgroundColor: colors.maroon
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: colors.text,
              font: { family: 'Outfit', weight: '500' }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ₹${context.raw.toLocaleString('en-IN')}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: colors.grid },
            ticks: { color: colors.text, font: { family: 'Inter' } }
          },
          y: {
            grid: { color: colors.grid },
            ticks: {
              color: colors.text,
              font: { family: 'Inter' },
              callback: function(value) {
                if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + ' Cr';
                if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + ' L';
                if (value >= 1000) return '₹' + (value / 1000).toFixed(0) + ' K';
                return '₹' + value;
              }
            }
          }
        }
      }
    });
  }

  // Central trigger exposed to the dashboard app modules
  window.updateDashboardCharts = function() {
    drawExpensesChart();
    drawProjectionChart();
  };

  // Timeline buttons listener
  const timelinePicker = document.getElementById('timelinePicker');
  if (timelinePicker) {
    timelinePicker.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        timelinePicker.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        projectionYears = parseInt(btn.getAttribute('data-years')) || 5;
        drawProjectionChart();
      });
    });
  }
});

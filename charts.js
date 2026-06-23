document.addEventListener('DOMContentLoaded', () => {
  let expensesChart   = null;
  let projectionChart = null;
  let allocationChart = null;
  let projectionYears = 10;

  function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text:      isDark ? '#b69fa2' : '#745c60',
      grid:      isDark ? '#361f23' : '#e8deda',
      maroon:    isDark ? '#b3002d' : '#800020',
      gold:      isDark ? '#f3cd4c' : '#d4af37',
      goldGlow:  isDark ? 'rgba(243,205,76,0.2)'  : 'rgba(212,175,55,0.1)',
      maroonGlow:isDark ? 'rgba(179,0,45,0.2)'    : 'rgba(128,0,32,0.05)',
    };
  }

  // ── full 12-category palette (fixed, no theme variation for pie slices) ──
  const CAT_COLORS = {
    housing:       '#800020', // brand maroon
    groceries:     '#2d7a2d', // forest green
    utilities:     '#1565c0', // navy blue
    transport:     '#e65100', // deep orange
    entertainment: '#6a1b9a', // purple
    insurance:     '#c62828', // brick red
    subscription:  '#00838f', // teal
    lic:           '#4e342e', // dark brown
    health:        '#2e7d32', // medium green
    travel:        '#d4af37', // brand gold
    extra:         '#5d4037', // warm brown
    miscellaneous: '#757575', // neutral grey
  };

  const CAT_LABELS = {
    housing:       'Housing / Rent',
    groceries:     'Groceries / Food',
    utilities:     'Utilities / Bills',
    transport:     'Transport',
    entertainment: 'Entertainment',
    insurance:     'Insurance',
    subscription:  'Subscriptions',
    lic:           'LIC Premium',
    health:        'Health & Medical',
    travel:        'Travel',
    extra:         'Extra / Splurge',
    miscellaneous: 'Miscellaneous',
  };

  // ── allocation palette per investment type ────────────────────────────
  const ALLOC_COLORS = {
    sip:      '#d4af37', // gold
    'lump-sum':'#c0392b', // warm red
    stocks:   '#1565c0', // blue
    lic:      '#800020', // maroon
  };
  const ALLOC_LABELS = {
    sip:       'Mutual Fund SIP',
    'lump-sum':'FD / Lump-sum',
    stocks:    'Stocks',
    lic:       'LIC / Insurance',
  };

  // ==========================================================
  // 1. EXPENSE BREAKDOWN CHART — all 12 categories
  // ==========================================================
  function drawExpensesChart() {
    const canvas = document.getElementById('expensesChart');
    if (!canvas) return;

    const expenses = window.getExpenses ? window.getExpenses() : [];
    const colors   = getThemeColors();

    // Bucket every expense into one of the 12 known categories
    const buckets = Object.fromEntries(Object.keys(CAT_COLORS).map(k => [k, 0]));
    let total = 0;

    expenses.forEach(exp => {
      const amt = parseFloat(exp.amount) || 0;
      const cat = CAT_COLORS[exp.category] !== undefined ? exp.category : 'miscellaneous';
      buckets[cat] += amt;
      total += amt;
    });

    const labels = [], data = [], bgColors = [];
    Object.keys(buckets).forEach(cat => {
      if (buckets[cat] > 0) {
        labels.push(CAT_LABELS[cat]);
        data.push(buckets[cat]);
        bgColors.push(CAT_COLORS[cat]);
      }
    });

    if (total === 0) {
      labels.push('No Expenses Logged');
      data.push(1);
      bgColors.push(colors.grid);
    }

    if (expensesChart) expensesChart.destroy();

    expensesChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: bgColors,
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
              font: { family: 'Inter', size: 11 },
              padding: 12,
              usePointStyle: true
            }
          },
          tooltip: {
            enabled: total > 0,
            callbacks: {
              label: (ctx) => {
                const pct = ((ctx.raw / total) * 100).toFixed(1);
                return ` ${ctx.label}: ₹${ctx.raw.toLocaleString('en-IN')} (${pct}%)`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  // ── Helper: monthly cash surplus from recurring income − expenses − SIP outgo ──
  function calculateMonthlySurplus() {
    const today       = new Date();
    const income      = window.getIncome      ? window.getIncome()      : [];
    const expenses    = window.getExpenses    ? window.getExpenses()    : [];
    const investments = window.getInvestments ? window.getInvestments() : [];

    const recurringIncome = income
      .filter(i => i.isRecurring && !(i.endDate && new Date(i.endDate) < today))
      .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

    const recurringExpenses = expenses
      .filter(e => e.isRecurring && !(e.endDate && new Date(e.endDate) < today))
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    const monthlySIPOutgo = investments
      .filter(inv => inv.status !== 'closed' && !(inv.endDate && new Date(inv.endDate) < today))
      .reduce((s, inv) => {
        if (inv.type === 'sip') return s + (parseFloat(inv.amount) || 0);
        if (inv.type === 'lic') {
          const freqMap = { monthly: 1, quarterly: 3, 'half-yearly': 6, annually: 12 };
          return s + (parseFloat(inv.amount) || 0) / (freqMap[inv.licPremiumFreq] || 12);
        }
        return s;
      }, 0);

    return Math.max(0, recurringIncome - recurringExpenses - monthlySIPOutgo);
  }

  // ==========================================================
  // 2. WEALTH PROJECTION CHART — real compound growth + savings scenario
  // ==========================================================
  function drawProjectionChart() {
    const canvas = document.getElementById('projectionChart');
    if (!canvas) return;

    const investments = (window.getInvestments ? window.getInvestments() : [])
      .filter(inv => inv.status !== 'closed');
    const colors = getThemeColors();
    const monthlySurplus     = calculateMonthlySurplus();
    // Conservative 12% p.a. (index fund average) for surplus savings scenario
    const surplusMonthlyRate = Math.pow(1.12, 1 / 12) - 1;

    const labels = [], totalWealthData = [], principalData = [], scenarioData = [];

    for (let y = 0; y <= projectionYears; y++) {
      labels.push(y === 0 ? 'Now' : `+${y}Y`);
      let totalPortfolioVal = 0;
      let totalPrincipalVal = 0;

      investments.forEach(inv => {
        const currentVals = window.calculateInvestmentValue
          ? window.calculateInvestmentValue(inv)
          : { principal: 0, currentValue: 0, elapsedMonths: 0 };
        if (currentVals.closed) return;

        let assetPrincipal = currentVals.principal;
        let assetVal       = currentVals.currentValue;

        if (y > 0) {
          const r              = parseFloat(inv.rate) / 100;
          const monthlyRate    = Math.pow(1 + r, 1 / 12) - 1;
          const principalInput = parseFloat(inv.amount);
          const projMonths     = y * 12;

          switch (inv.type) {
            case 'sip': {
              const elapsedM   = currentVals.elapsedMonths;
              const maxM       = parseFloat(inv.duration || 999) * 12;
              const remainingM = Math.max(0, maxM - elapsedM);
              const activeM    = Math.min(remainingM, projMonths);
              const compoundM  = Math.max(0, projMonths - activeM);

              // Grow existing corpus
              let futVal = assetVal * Math.pow(1 + monthlyRate, projMonths);

              // Ordinary annuity: future payments start next month (not now)
              if (activeM > 0 && monthlyRate >= 0.000001) {
                let futContrib = principalInput * ((Math.pow(1 + monthlyRate, activeM) - 1) / monthlyRate);
                if (compoundM > 0) futContrib *= Math.pow(1 + monthlyRate, compoundM);
                futVal += futContrib;
              } else if (activeM > 0) {
                futVal += principalInput * activeM;
              }

              assetVal = futVal;
              assetPrincipal += principalInput * activeM;
              break;
            }

            case 'lump-sum':
            case 'stocks': {
              const n = parseInt(inv.compounding, 10) || 12;
              let projY = y;
              if (inv.endDate) {
                const endMs = new Date(inv.endDate).getTime();
                const nowMs = Date.now();
                const futMs = nowMs + y * 365.25 * 24 * 3600 * 1000;
                if (futMs > endMs && endMs > nowMs) {
                  projY = (endMs - nowMs) / (365.25 * 24 * 3600 * 1000);
                } else if (endMs <= nowMs) {
                  projY = 0;
                }
              }
              assetVal = n === 0
                ? assetVal + (currentVals.principal * r * projY)
                : assetVal * Math.pow(1 + r / n, n * projY);
              break;
            }

            case 'lic': {
              const totalPolicyMonths = parseFloat(inv.duration || 0) * 12;
              const elapsedM          = currentVals.elapsedMonths;
              const futureElapsedM    = elapsedM + projMonths;

              if (inv.licSumAssured && futureElapsedM >= totalPolicyMonths) {
                assetVal = parseFloat(inv.licSumAssured);
              } else {
                let freqM = 12;
                if (inv.licPremiumFreq === 'monthly')     freqM = 1;
                if (inv.licPremiumFreq === 'quarterly')   freqM = 3;
                if (inv.licPremiumFreq === 'half-yearly') freqM = 6;

                const remainingM  = Math.max(0, totalPolicyMonths - elapsedM);
                const activeM     = Math.min(remainingM, projMonths);
                const futPmtCount = Math.floor(activeM / freqM);

                let futVal = assetVal * Math.pow(1 + r, y);
                for (let i = 1; i <= futPmtCount; i++) {
                  const ySince = (projMonths - i * freqM) / 12;
                  futVal += principalInput * Math.pow(1 + r, ySince);
                }
                assetVal = Math.min(futVal, inv.licSumAssured ? parseFloat(inv.licSumAssured) : futVal);
                assetPrincipal += principalInput * futPmtCount;
              }
              break;
            }
          }
        }

        totalPortfolioVal += assetVal;
        totalPrincipalVal += assetPrincipal;
      });

      totalWealthData.push(Math.round(totalPortfolioVal));
      principalData.push(Math.round(totalPrincipalVal));

      // Scenario: portfolio + invest the monthly surplus at 12% p.a.
      if (monthlySurplus > 0 && y > 0) {
        const n         = y * 12;
        const surplusFV = monthlySurplus * ((Math.pow(1 + surplusMonthlyRate, n) - 1) / surplusMonthlyRate);
        scenarioData.push(Math.round(totalPortfolioVal + surplusFV));
      } else {
        scenarioData.push(Math.round(totalPortfolioVal));
      }
    }

    if (projectionChart) projectionChart.destroy();

    const datasets = [
      {
        label: 'Projected Portfolio',
        data: totalWealthData,
        borderColor: colors.gold,
        backgroundColor: colors.goldGlow,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
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
    ];

    if (monthlySurplus > 0) {
      datasets.push({
        label: `With ₹${Math.round(monthlySurplus / 1000)}K Savings/mo`,
        data: scenarioData,
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(46,125,50,0.07)',
        borderWidth: 2.5,
        borderDash: [8, 4],
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#2e7d32',
        pointHoverRadius: 6
      });
    }

    projectionChart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: colors.text, font: { family: 'Outfit', weight: '500' } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ₹${ctx.raw.toLocaleString('en-IN')}`
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
              callback: (v) => {
                if (v >= 10000000) return '₹' + (v / 10000000).toFixed(1) + ' Cr';
                if (v >= 100000)   return '₹' + (v / 100000).toFixed(1) + ' L';
                if (v >= 1000)     return '₹' + (v / 1000).toFixed(0) + ' K';
                return '₹' + v;
              }
            }
          }
        }
      }
    });
  }

  // ==========================================================
  // 3. INVESTMENT ALLOCATION DONUT — current value by type
  // ==========================================================
  function drawAllocationChart() {
    const canvas = document.getElementById('allocationChart');
    if (!canvas) return;

    const investments = (window.getInvestments ? window.getInvestments() : [])
      .filter(inv => inv.status !== 'closed');
    const colors = getThemeColors();

    const buckets = { sip: 0, 'lump-sum': 0, stocks: 0, lic: 0 };
    let total = 0;

    investments.forEach(inv => {
      const val = window.calculateInvestmentValue
        ? (window.calculateInvestmentValue(inv)?.currentValue || 0)
        : 0;
      const t = buckets[inv.type] !== undefined ? inv.type : 'lump-sum';
      buckets[t] += val;
      total += val;
    });

    const labels = [], data = [], bgColors = [];
    Object.keys(buckets).forEach(t => {
      if (buckets[t] > 0) {
        labels.push(ALLOC_LABELS[t]);
        data.push(Math.round(buckets[t]));
        bgColors.push(ALLOC_COLORS[t]);
      }
    });

    if (total === 0) {
      labels.push('No Investments Yet');
      data.push(1);
      bgColors.push(colors.grid);
    }

    if (allocationChart) allocationChart.destroy();

    allocationChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: bgColors,
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
              font: { family: 'Inter', size: 11 },
              padding: 14,
              usePointStyle: true
            }
          },
          tooltip: {
            enabled: total > 0,
            callbacks: {
              label: (ctx) => {
                const pct = ((ctx.raw / total) * 100).toFixed(1);
                return ` ${ctx.label}: ₹${ctx.raw.toLocaleString('en-IN')} (${pct}%)`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  // Central trigger exposed to the dashboard modules
  window.updateDashboardCharts = function () {
    drawExpensesChart();
    drawProjectionChart();
    drawAllocationChart();
  };

  // Timeline button listeners
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

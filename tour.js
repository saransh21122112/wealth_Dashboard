// Aurelia Guided Application Tour Controller
document.addEventListener('DOMContentLoaded', () => {
  let activeTourStep = 0;
  let tourBackdrop   = null;
  let tourPopover    = null;

  function isMobile() {
    return window.innerWidth <= 768;
  }

  // Desktop steps — sidebar is visible
  const desktopSteps = [
    {
      elementSelector: '#appSidebar',
      title: 'Sidebar Navigation',
      body: 'Switch between tabs: <strong>Overview</strong>, <strong>Expenses</strong>, <strong>Investments</strong>, and more. Admin users see an extra <strong>Admin Panel</strong> entry here.',
      position: 'right'
    },
    {
      elementSelector: '#aiFloatBtn',
      title: 'Aurelia AI — Always There',
      body: 'Click this button anytime to chat with your AI. Log expenses, add investments, or ask anything — <em>"I spent ₹1500 on groceries"</em>, <em>"Add HDFC SIP ₹5000/month"</em>. The AI handles it instantly.',
      position: 'top'
    },
    {
      elementSelector: '.metrics-grid',
      title: 'Unified Wealth Metrics',
      body: 'Track your real-time <strong>Net Worth</strong>, total <strong>Investments</strong> value, and monthly spending — all in one place, always in sync with what you log.',
      position: 'bottom'
    },
    {
      elementSelector: '.visuals-grid',
      title: 'Analytics & Projections',
      body: 'Expense category breakdown and a <strong>Future Wealth Projection</strong> chart. Switch between 5Y / 10Y / 20Y timelines. A "savings invested" scenario line shows your full wealth potential.',
      position: 'top'
    }
  ];

  // Mobile steps — sidebar is hidden; use mobile-visible elements
  const mobileSteps = [
    {
      elementSelector: '#mobileHeader',
      title: 'Navigation',
      body: 'Tap the <strong>☰ menu icon</strong> (top-right) to open the sidebar and switch tabs. Tap <strong>?</strong> anytime to restart this tour.',
      position: 'bottom'
    },
    {
      elementSelector: '#aiFloatBtn',
      title: 'Aurelia AI — Always There',
      body: 'Tap the button at the bottom-right anytime to chat with your AI. Log expenses, add investments, or ask anything — <em>"I spent ₹1500 on groceries"</em> — and the AI logs it instantly.',
      position: 'top'
    },
    {
      elementSelector: '.metrics-grid',
      title: 'Wealth Metrics',
      body: 'Your real-time <strong>Net Worth</strong>, <strong>Investments</strong> value, and monthly spending — always updated when you log a new entry.',
      position: 'bottom'
    },
    {
      elementSelector: '.visuals-grid',
      title: 'Charts & Projections',
      body: 'Expense breakdown and a <strong>Future Wealth Projection</strong>. Switch between 5Y / 10Y / 20Y. The dotted green line shows what happens if you invest your monthly surplus.',
      position: 'top'
    }
  ];

  function getSteps() {
    return isMobile() ? mobileSteps : desktopSteps;
  }

  function createTourElements() {
    if (!tourBackdrop) {
      tourBackdrop = document.createElement('div');
      tourBackdrop.className = 'tour-backdrop';
      document.body.appendChild(tourBackdrop);
    }
    if (!tourPopover) {
      tourPopover = document.createElement('div');
      tourPopover.className = 'tour-popover';
      document.body.appendChild(tourPopover);
    }
  }

  function startTour() {
    activeTourStep = 0;
    createTourElements();
    if (!isMobile()) {
      document.body.style.overflow = 'hidden';
    }
    renderTourStep();
  }

  function endTour() {
    if (tourBackdrop) { tourBackdrop.remove(); tourBackdrop = null; }
    if (tourPopover)  { tourPopover.remove();  tourPopover  = null; }
    document.body.style.overflow = '';
  }

  function renderTourStep() {
    const steps  = getSteps();
    const step   = steps[activeTourStep];
    const target = document.querySelector(step.elementSelector);

    if (!target) {
      nextStep();
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
      const rect    = target.getBoundingClientRect();
      const pad     = 8;
      const mobile  = isMobile();

      // Backdrop spotlight
      tourBackdrop.style.top    = `${rect.top    - pad}px`;
      tourBackdrop.style.left   = `${rect.left   - pad}px`;
      tourBackdrop.style.width  = `${rect.width  + pad * 2}px`;
      tourBackdrop.style.height = `${rect.height + pad * 2}px`;

      // Popover content
      const steps2     = getSteps();
      const isLast     = activeTourStep === steps2.length - 1;
      tourPopover.innerHTML = `
        <div class="tour-popover-header">
          <span class="tour-popover-title">${step.title}</span>
          <span class="tour-popover-step">Step ${activeTourStep + 1} of ${steps2.length}</span>
        </div>
        <div class="tour-popover-body">${step.body}</div>
        <div class="tour-popover-actions">
          <button class="btn btn-secondary tour-btn" id="tourSkipBtn">Skip</button>
          <div style="display:flex;gap:0.5rem;">
            ${activeTourStep > 0 ? '<button class="btn btn-secondary tour-btn" id="tourBackBtn">Back</button>' : ''}
            <button class="btn btn-primary tour-btn" id="tourNextBtn" style="color:white;border:none;">${isLast ? 'Finish' : 'Next'}</button>
          </div>
        </div>
      `;

      // Position popover
      if (mobile) {
        // CSS media query turns .tour-popover into a bottom sheet — just clear inline styles
        tourPopover.style.left  = '';
        tourPopover.style.top   = '';
        tourPopover.style.width = '';
      } else {
        const pRect  = tourPopover.getBoundingClientRect();
        const gap    = 16;
        const margin = 10;
        let lv = 0, tv = 0;

        if (step.position === 'right') {
          lv = rect.right + gap;
          tv = rect.top + rect.height / 2 - pRect.height / 2;
        } else if (step.position === 'top') {
          lv = rect.left + rect.width / 2 - pRect.width / 2;
          tv = rect.top - pRect.height - gap;
        } else {
          lv = rect.left + rect.width / 2 - pRect.width / 2;
          tv = rect.bottom + gap;
        }

        lv = Math.max(margin, Math.min(lv, window.innerWidth  - pRect.width  - margin));
        tv = Math.max(margin, Math.min(tv, window.innerHeight - pRect.height - margin));

        tourPopover.style.left  = `${lv}px`;
        tourPopover.style.top   = `${tv}px`;
        tourPopover.style.width = '';
      }

      // Wire buttons
      document.getElementById('tourSkipBtn').addEventListener('click', endTour);
      const nextBtn = document.getElementById('tourNextBtn');
      nextBtn.addEventListener('click', () => isLast ? endTour() : nextStep());
      const backBtn = document.getElementById('tourBackBtn');
      if (backBtn) backBtn.addEventListener('click', prevStep);
    }, 150);
  }

  function nextStep() {
    if (activeTourStep < getSteps().length - 1) {
      activeTourStep++;
      renderTourStep();
    }
  }

  function prevStep() {
    if (activeTourStep > 0) {
      activeTourStep--;
      renderTourStep();
    }
  }

  // Desktop sidebar tour button
  const startTourBtn = document.getElementById('startTourBtn');
  if (startTourBtn) {
    startTourBtn.addEventListener('click', () => {
      const overviewBtn = document.querySelector('.nav-item[data-tab="dashboard"]');
      if (overviewBtn) overviewBtn.click();
      setTimeout(startTour, 300);
    });
  }

  // Mobile header tour button
  const mobileTourBtn = document.getElementById('mobileTourBtn');
  if (mobileTourBtn) {
    mobileTourBtn.addEventListener('click', () => {
      const sidebar = document.getElementById('appSidebar');
      if (sidebar) sidebar.classList.remove('open');
      const overlay = document.querySelector('.sidebar-overlay');
      if (overlay) overlay.classList.remove('visible');
      const overviewBtn = document.querySelector('.nav-item[data-tab="dashboard"]');
      if (overviewBtn) overviewBtn.click();
      setTimeout(startTour, 300);
    });
  }

  // Auto-trigger for new signups
  window.addEventListener('aurelia-login', (e) => {
    if (e.detail && e.detail.isNew) {
      setTimeout(startTour, 1200);
    }
  });
});

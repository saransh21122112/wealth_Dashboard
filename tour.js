// Aurelia Guided Application Tour Controller
document.addEventListener('DOMContentLoaded', () => {
  let activeTourStep = 0;
  let tourBackdrop = null;
  let tourPopover = null;

  // Tour steps definition
  const tourSteps = [
    {
      elementSelector: '#appSidebar',
      title: 'Sidebar Navigation',
      body: 'Switch between your tabs here: <strong>Overview</strong>, <strong>Expenses Tracker</strong>, <strong>Investments Portfolio</strong>, and <strong>Backup Settings</strong>. If you log in as an administrator, an extra <strong>Admin Panel</strong> button will appear here to inspect all platform users.',
      position: 'right'
    },
    {
      elementSelector: '.ai-assistant-card',
      title: 'Aurelia AI Assistant',
      body: 'This is the <strong>heart of the application</strong>! Instead of manually filling forms, you can type details of your earnings, salary, expenses, or investments here. The AI will ask you questions and log them directly for you in the correct tabs. Try saying: <em>"I spent ₹1500 on groceries today"</em>.',
      position: 'bottom'
    },
    {
      elementSelector: '.metrics-grid',
      title: 'Unified Wealth Metrics',
      body: 'Track your real-time <strong>Net Worth</strong> (accumulated current assets minus total logged expenses), total estimated value of your <strong>Investments</strong>, and monthly recurring outlays in one place.',
      position: 'bottom'
    },
    {
      elementSelector: '.visuals-grid',
      title: 'Analytics & Projections',
      body: 'Analyze your expense category breakdown in the pie chart. In the line chart, view the <strong>Future Wealth Projection</strong> of all your current assets compounded over a 5, 10, 20, or 30-year timeline.',
      position: 'top'
    }
  ];

  function createTourElements() {
    // 1. Create backdrop spotlight mask
    if (!tourBackdrop) {
      tourBackdrop = document.createElement('div');
      tourBackdrop.className = 'tour-backdrop';
      document.body.appendChild(tourBackdrop);
    }

    // 2. Create popover container
    if (!tourPopover) {
      tourPopover = document.createElement('div');
      tourPopover.className = 'tour-popover';
      document.body.appendChild(tourPopover);
    }
  }

  function startTour() {
    activeTourStep = 0;
    createTourElements();
    
    // Disable main window scroll to avoid positioning issues during tour
    document.body.style.overflow = 'hidden';
    
    renderTourStep();
  }

  function endTour() {
    if (tourBackdrop) {
      tourBackdrop.remove();
      tourBackdrop = null;
    }
    if (tourPopover) {
      tourPopover.remove();
      tourPopover = null;
    }
    
    // Restore scrolling
    document.body.style.overflow = '';
  }

  function renderTourStep() {
    const step = tourSteps[activeTourStep];
    const targetElement = document.querySelector(step.elementSelector);

    if (!targetElement) {
      // Element not present on current tab, skip or end
      nextStep();
      return;
    }

    // Scroll target into view if needed
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wait slightly for scroll animation
    setTimeout(() => {
      const rect = targetElement.getBoundingClientRect();
      const padding = 8;

      // 1. Update Backdrop spotlight position
      tourBackdrop.style.top = `${rect.top - padding}px`;
      tourBackdrop.style.left = `${rect.left - padding}px`;
      tourBackdrop.style.width = `${rect.width + padding * 2}px`;
      tourBackdrop.style.height = `${rect.height + padding * 2}px`;

      // 2. Populate Popover content
      const isLastStep = activeTourStep === tourSteps.length - 1;
      
      tourPopover.innerHTML = `
        <div class="tour-popover-header">
          <span class="tour-popover-title">${step.title}</span>
          <span class="tour-popover-step">Step ${activeTourStep + 1} of ${tourSteps.length}</span>
        </div>
        <div class="tour-popover-body">${step.body}</div>
        <div class="tour-popover-actions">
          <button class="btn btn-secondary tour-btn" id="tourSkipBtn">Skip</button>
          <div style="display: flex; gap: 0.5rem;">
            ${activeTourStep > 0 ? '<button class="btn btn-secondary tour-btn" id="tourBackBtn">Back</button>' : ''}
            <button class="btn btn-primary tour-btn" id="tourNextBtn" style="color: white; border: none;">${isLastStep ? 'Finish' : 'Next'}</button>
          </div>
        </div>
      `;

      // 3. Position Popover relative to highlight area
      const popoverRect = tourPopover.getBoundingClientRect();
      const gap = 16;
      let topVal = 0;
      let leftVal = 0;

      // Layout specific positioning calculations
      if (step.position === 'right') {
        leftVal = rect.right + gap;
        topVal = rect.top + rect.height / 2 - popoverRect.height / 2;
      } else if (step.position === 'top') {
        leftVal = rect.left + rect.width / 2 - popoverRect.width / 2;
        topVal = rect.top - popoverRect.height - gap;
      } else { // default 'bottom'
        leftVal = rect.left + rect.width / 2 - popoverRect.width / 2;
        topVal = rect.bottom + gap;
      }

      // Bound within viewport limits to prevent overflowing screen edges
      const margin = 10;
      leftVal = Math.max(margin, Math.min(leftVal, window.innerWidth - popoverRect.width - margin));
      topVal = Math.max(margin, Math.min(topVal, window.innerHeight - popoverRect.height - margin));

      tourPopover.style.left = `${leftVal}px`;
      tourPopover.style.top = `${topVal}px`;

      // 4. Wire up action buttons
      document.getElementById('tourSkipBtn').addEventListener('click', endTour);
      
      const nextBtn = document.getElementById('tourNextBtn');
      nextBtn.addEventListener('click', () => {
        if (isLastStep) {
          endTour();
        } else {
          nextStep();
        }
      });

      const backBtn = document.getElementById('tourBackBtn');
      if (backBtn) {
        backBtn.addEventListener('click', prevStep);
      }
    }, 150);
  }

  function nextStep() {
    if (activeTourStep < tourSteps.length - 1) {
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

  // Handle tour trigger from manual button
  const startTourBtn = document.getElementById('startTourBtn');
  if (startTourBtn) {
    startTourBtn.addEventListener('click', () => {
      // Force user to overview tab to show the tour correctly
      const overviewTabNav = document.querySelector('.nav-item[data-tab="dashboard"]');
      if (overviewTabNav) {
        overviewTabNav.click();
      }
      setTimeout(startTour, 300);
    });
  }

  // Automatically trigger tour on custom login events for NEW signups
  window.addEventListener('aurelia-login', (e) => {
    if (e.detail && e.detail.isNew) {
      // Wait 1200ms to let dashboard completely show and render charts
      setTimeout(startTour, 1200);
    }
  });
});

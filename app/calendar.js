const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function setupCalendar({ store, formatCurrency }) {
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth();

  const grid = document.getElementById('calendarGrid');
  const monthLabel = document.getElementById('calendarMonthYear');
  const prevBtn = document.getElementById('calendarPrevBtn');
  const nextBtn = document.getElementById('calendarNextBtn');
  const tooltip = document.getElementById('calTooltip');

  if (!grid) return { renderCalendar: () => {} };

  prevBtn.addEventListener('click', () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render(); });
  nextBtn.addEventListener('click', () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render(); });

  function getEventsForDay(date) {
    const { currentUser } = store.state;
    if (!currentUser) return [];

    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const events = [];

    for (const inc of currentUser.income || []) {
      if (inc.isRecurring) {
        const incDay = inc.recurringDay || new Date(inc.date + 'T00:00:00').getDate();
        if (incDay === d) events.push({ type: 'income', label: inc.description, amount: inc.amount });
      } else if (inc.date === dateStr) {
        events.push({ type: 'income', label: inc.description, amount: inc.amount });
      }
    }

    for (const exp of currentUser.expenses || []) {
      if (exp.isRecurring) {
        if (exp.endDate && new Date(exp.endDate) < date) continue;
        const expDay = exp.recurringDay || new Date(exp.date + 'T00:00:00').getDate();
        if (expDay === d) events.push({ type: 'expense', label: exp.description, amount: exp.amount });
      } else if (exp.date === dateStr) {
        events.push({ type: 'expense', label: exp.description, amount: exp.amount });
      }
    }

    for (const inv of currentUser.investments || []) {
      const start = new Date(inv.startDate + 'T00:00:00');
      if (start > date) continue;
      if (inv.endDate && new Date(inv.endDate) < date) continue;

      if (inv.type === 'sip') {
        const sipDay = inv.recurringDay || start.getDate();
        if (sipDay === d) events.push({ type: 'investment', label: `${inv.name} SIP`, amount: inv.amount });
      } else if (inv.type === 'lic') {
        const freq = inv.licPremiumFreq || 'annually';
        const premDay = inv.recurringDay || start.getDate();
        const startMonth = start.getMonth();
        if (freq === 'monthly' && premDay === d) {
          events.push({ type: 'investment', label: `${inv.name} premium`, amount: inv.amount });
        } else if (freq === 'quarterly' && premDay === d) {
          const diff = (y - start.getFullYear()) * 12 + (m - startMonth);
          if (diff % 3 === 0) events.push({ type: 'investment', label: `${inv.name} premium`, amount: inv.amount });
        } else if (freq === 'half-yearly' && premDay === d) {
          const diff = (y - start.getFullYear()) * 12 + (m - startMonth);
          if (diff % 6 === 0) events.push({ type: 'investment', label: `${inv.name} premium`, amount: inv.amount });
        } else if (freq === 'annually' && premDay === d && startMonth === m) {
          events.push({ type: 'investment', label: `${inv.name} premium`, amount: inv.amount });
        }
      }
    }

    return events;
  }

  function showTooltip(cell, date, events) {
    if (!tooltip || events.length === 0) return;

    const colorMap = { income: 'var(--color-success)', expense: 'var(--color-error)', investment: 'var(--color-gold)' };
    const signMap = { income: '+', expense: '−', investment: '−' };

    const dateLabel = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
    const rows = events.map(e => `
      <div class="cal-tooltip-item">
        <span class="cal-tooltip-label" style="color:${colorMap[e.type]}">${e.label}</span>
        <span class="cal-tooltip-amount" style="color:${colorMap[e.type]}">${signMap[e.type]}${formatCurrency(e.amount)}</span>
      </div>`).join('');

    tooltip.innerHTML = `
      <div class="cal-tooltip-date">${dateLabel}</div>
      ${rows}
      <div class="cal-tooltip-ask">Click to ask Aurelia</div>
    `;
    tooltip.style.display = 'block';

    // Position: above the cell, horizontally aligned, smart edge-clamping
    const calRect = grid.closest('.calendar-card').getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    let top = cellRect.top - calRect.top - tooltip.offsetHeight - 6;
    let left = cellRect.left - calRect.left + cellRect.width / 2 - tooltip.offsetWidth / 2;

    // Flip below if not enough room above
    if (top < 0) top = cellRect.top - calRect.top + cellRect.height + 6;
    // Clamp horizontal edges
    const cardWidth = calRect.width;
    if (left < 4) left = 4;
    if (left + tooltip.offsetWidth > cardWidth - 4) left = cardWidth - tooltip.offsetWidth - 4;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  function hideTooltip() {
    if (tooltip) tooltip.style.display = 'none';
  }

  function render() {
    const today = new Date();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    monthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    grid.innerHTML = '';
    hideTooltip();

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day cal-day-empty';
      grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day);
      const events = getEventsForDay(date);
      const hasIncome = events.some(e => e.type === 'income');
      const hasExpense = events.some(e => e.type === 'expense');
      const hasInvestment = events.some(e => e.type === 'investment');
      const isToday = today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;

      const cell = document.createElement('div');
      cell.className = `cal-day${isToday ? ' cal-today' : ''}`;
      cell.innerHTML = `
        <span class="cal-day-num">${day}</span>
        <div class="cal-dots">
          ${hasIncome ? '<span class="cal-dot cal-dot-income"></span>' : ''}
          ${hasExpense ? '<span class="cal-dot cal-dot-expense"></span>' : ''}
          ${hasInvestment ? '<span class="cal-dot cal-dot-investment"></span>' : ''}
        </div>
      `;

      if (events.length > 0) {
        cell.addEventListener('mouseenter', () => showTooltip(cell, date, events));
        cell.addEventListener('mouseleave', hideTooltip);

        // Click → pre-fill AI chat with context
        cell.addEventListener('click', () => {
          const input = document.getElementById('aiChatInput');
          if (!input) return;
          const dateStr = `${day} ${MONTH_NAMES[viewMonth]} ${viewYear}`;
          const lines = events.map(e => `${e.label} (${formatCurrency(e.amount)})`).join(', ');
          input.value = `On ${dateStr} I have: ${lines}. Give me a brief summary and tips.`;
          input.focus();
          document.getElementById('aiChatMessages')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }

      grid.appendChild(cell);
    }
  }

  render();
  return { renderCalendar: render };
}

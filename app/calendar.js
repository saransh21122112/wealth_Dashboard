const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function setupCalendar({ store, formatCurrency }) {
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth();
  let selectedDay = null;

  const grid = document.getElementById('calendarGrid');
  const monthLabel = document.getElementById('calendarMonthYear');
  const eventsPanel = document.getElementById('calendarEventsPanel');
  const eventsList = document.getElementById('calendarEventsList');
  const eventsDateLabel = document.getElementById('calendarEventsDate');
  const prevBtn = document.getElementById('calendarPrevBtn');
  const nextBtn = document.getElementById('calendarNextBtn');
  const askAIBtn = document.getElementById('calendarAskAIBtn');

  if (!grid) return { renderCalendar: () => {} };

  prevBtn.addEventListener('click', () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render(); });
  nextBtn.addEventListener('click', () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render(); });

  askAIBtn.addEventListener('click', () => {
    if (!selectedDay) return;
    const input = document.getElementById('aiChatInput');
    const form = document.getElementById('aiChatForm');
    if (!input || !form) return;

    const dateStr = `${selectedDay.getDate()} ${MONTH_NAMES[selectedDay.getMonth()]} ${selectedDay.getFullYear()}`;
    const events = getEventsForDay(selectedDay);
    let prompt;
    if (events.length > 0) {
      const lines = events.map(e => `${e.label} (₹${parseFloat(e.amount).toLocaleString('en-IN')})`).join(', ');
      prompt = `On ${dateStr} I have: ${lines}. Give me a brief summary and any tips.`;
    } else {
      prompt = `What should I be aware of financially on ${dateStr}?`;
    }

    input.value = prompt;
    input.focus();
    // scroll AI chat into view
    document.getElementById('aiChatMessages')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

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
        const incDay = new Date(inc.date + 'T00:00:00').getDate();
        if (incDay === d) events.push({ type: 'income', label: inc.description, amount: inc.amount });
      } else if (inc.date === dateStr) {
        events.push({ type: 'income', label: inc.description, amount: inc.amount });
      }
    }

    for (const exp of currentUser.expenses || []) {
      if (exp.isRecurring) {
        const expDay = new Date(exp.date + 'T00:00:00').getDate();
        if (expDay === d) events.push({ type: 'expense', label: exp.description, amount: exp.amount });
      } else if (exp.date === dateStr) {
        events.push({ type: 'expense', label: exp.description, amount: exp.amount });
      }
    }

    for (const inv of currentUser.investments || []) {
      const start = new Date(inv.startDate + 'T00:00:00');
      if (start > date) continue;

      if (inv.type === 'sip') {
        if (start.getDate() === d) events.push({ type: 'investment', label: `${inv.name} SIP`, amount: inv.amount });
      } else if (inv.type === 'lic') {
        const freq = inv.licPremiumFreq || 'annually';
        const startDay = start.getDate();
        const startMonth = start.getMonth();

        if (freq === 'monthly' && startDay === d) {
          events.push({ type: 'investment', label: `${inv.name} premium`, amount: inv.amount });
        } else if (freq === 'quarterly' && startDay === d) {
          const monthDiff = (y - start.getFullYear()) * 12 + (m - startMonth);
          if (monthDiff % 3 === 0) events.push({ type: 'investment', label: `${inv.name} premium`, amount: inv.amount });
        } else if (freq === 'half-yearly' && startDay === d) {
          const monthDiff = (y - start.getFullYear()) * 12 + (m - startMonth);
          if (monthDiff % 6 === 0) events.push({ type: 'investment', label: `${inv.name} premium`, amount: inv.amount });
        } else if (freq === 'annually' && startDay === d && startMonth === m) {
          events.push({ type: 'investment', label: `${inv.name} premium`, amount: inv.amount });
        }
      }
    }

    return events;
  }

  function getDayEventTypes(date) {
    const events = getEventsForDay(date);
    return {
      hasIncome: events.some(e => e.type === 'income'),
      hasExpense: events.some(e => e.type === 'expense'),
      hasInvestment: events.some(e => e.type === 'investment')
    };
  }

  function showEventsPanel(date) {
    selectedDay = date;
    const events = getEventsForDay(date);
    const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()];
    eventsDateLabel.textContent = `${dayName}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

    if (events.length === 0) {
      eventsList.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;margin:0;">No financial events on this day.</p>`;
    } else {
      eventsList.innerHTML = events.map(e => {
        const colorMap = { income: 'var(--color-success)', expense: 'var(--color-error)', investment: 'var(--color-gold)' };
        const iconMap = { income: '↑', expense: '↓', investment: '◆' };
        return `<div class="cal-event-item">
          <span class="cal-event-dot" style="background:${colorMap[e.type]}">${iconMap[e.type]}</span>
          <span class="cal-event-label">${e.label}</span>
          <span class="cal-event-amount" style="color:${colorMap[e.type]}">${e.type === 'income' ? '+' : '−'}${formatCurrency(e.amount)}</span>
        </div>`;
      }).join('');
    }

    eventsPanel.style.display = 'block';
  }

  function render() {
    const today = new Date();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    monthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

    grid.innerHTML = '';
    // leading empty cells
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day cal-day-empty';
      grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day);
      const { hasIncome, hasExpense, hasInvestment } = getDayEventTypes(date);
      const isToday = today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;
      const isSelected = selectedDay && selectedDay.getDate() === day && selectedDay.getMonth() === viewMonth && selectedDay.getFullYear() === viewYear;

      const cell = document.createElement('div');
      cell.className = `cal-day${isToday ? ' cal-today' : ''}${isSelected ? ' cal-selected' : ''}`;

      cell.innerHTML = `
        <span class="cal-day-num">${day}</span>
        <div class="cal-dots">
          ${hasIncome ? '<span class="cal-dot cal-dot-income"></span>' : ''}
          ${hasExpense ? '<span class="cal-dot cal-dot-expense"></span>' : ''}
          ${hasInvestment ? '<span class="cal-dot cal-dot-investment"></span>' : ''}
        </div>
      `;

      cell.addEventListener('click', () => {
        document.querySelectorAll('.cal-day.cal-selected').forEach(el => el.classList.remove('cal-selected'));
        cell.classList.add('cal-selected');
        showEventsPanel(date);
      });

      grid.appendChild(cell);
    }

    // re-render events panel if a day is already selected in this month
    if (selectedDay && selectedDay.getMonth() === viewMonth && selectedDay.getFullYear() === viewYear) {
      showEventsPanel(selectedDay);
    } else {
      eventsPanel.style.display = 'none';
      selectedDay = null;
    }
  }

  function renderCalendar() {
    render();
  }

  render();
  return { renderCalendar };
}

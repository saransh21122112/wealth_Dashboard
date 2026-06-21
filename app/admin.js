export function createAdminModule({ dom, store, calculations, formatCurrency, saveAccounts }) {
  const { calculateInvestmentValue } = calculations;

  function inspectUser(username) {
    const userToInspect = store.state.accounts.find((account) => account.username === username);
    if (!userToInspect || !dom.adminInspectorPanel) return;

    dom.adminInspectorPanel.style.display = 'flex';

    let totalInvested = 0;
    let totalCurrentValue = 0;
    (userToInspect.investments || []).forEach((investment) => {
      const values = calculateInvestmentValue(investment);
      totalInvested += values.principal;
      totalCurrentValue += values.currentValue;
    });

    let totalExpenses = 0;
    (userToInspect.expenses || []).forEach((expense) => {
      totalExpenses += parseFloat(expense.amount);
    });

    const netWorth = totalCurrentValue - totalExpenses;

    if (dom.adminUserNetWorth) dom.adminUserNetWorth.textContent = formatCurrency(netWorth);
    if (dom.adminUserInvestments) dom.adminUserInvestments.textContent = formatCurrency(totalCurrentValue);
    if (dom.adminUserExpenses) dom.adminUserExpenses.textContent = formatCurrency(totalExpenses);

    const roleBar = document.getElementById('adminUserRoleBar');
    if (roleBar) {
      const isSuperAdmin = username === 'admin';
      roleBar.innerHTML = `
        <div class="admin-role-bar">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${username}</span>
            <span id="adminInspectedRoleBadge" class="investment-tag" style="background: ${userToInspect.role === 'admin' ? 'var(--color-maroon)' : 'rgba(212,175,55,0.15)'}; color: ${userToInspect.role === 'admin' ? 'white' : 'var(--color-gold)'}; border: 1px solid ${userToInspect.role === 'admin' ? 'var(--color-maroon)' : 'var(--color-gold)'}; text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.05em;">${userToInspect.role}</span>
          </div>
          ${isSuperAdmin ? '<span style="font-size:0.82rem; color:var(--text-muted); font-style:italic;">Primary admin — role cannot be changed</span>' : `
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <select id="adminChangeRoleSelect" class="admin-inspect-select" style="min-width: 180px; padding: 0.45rem 0.75rem; font-size: 0.88rem;">
              <option value="user" ${userToInspect.role === 'user' ? 'selected' : ''}>Standard User</option>
              <option value="admin" ${userToInspect.role === 'admin' ? 'selected' : ''}>Administrator</option>
            </select>
            <button class="btn btn-primary" onclick="window.changeUserRole('${username}', document.getElementById('adminChangeRoleSelect').value)" style="color:white; border:none; padding:0.45rem 1rem; font-size:0.88rem; white-space:nowrap; cursor:pointer;">
              Update Role
            </button>
          </div>`}
        </div>
      `;
    }

    if (dom.adminUserInvestmentsTable) {
      dom.adminUserInvestmentsTable.innerHTML = '';
      if ((userToInspect.investments || []).length === 0) {
        dom.adminUserInvestmentsTable.innerHTML = '<tr><td colspan="5" class="empty-state">No investments logged.</td></tr>';
      } else {
        userToInspect.investments.forEach((investment) => {
          const { principal, currentValue } = calculateInvestmentValue(investment);
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><strong>${investment.name}</strong></td>
            <td><span class="investment-tag">${investment.type.toUpperCase()}</span></td>
            <td>₹${Math.round(principal).toLocaleString('en-IN')}</td>
            <td>${investment.rate}%</td>
            <td><strong>₹${Math.round(currentValue).toLocaleString('en-IN')}</strong></td>
          `;
          dom.adminUserInvestmentsTable.appendChild(row);
        });
      }
    }

    if (dom.adminUserExpensesTable) {
      dom.adminUserExpensesTable.innerHTML = '';
      if ((userToInspect.expenses || []).length === 0) {
        dom.adminUserExpensesTable.innerHTML = '<tr><td colspan="4" class="empty-state">No expenses logged.</td></tr>';
      } else {
        userToInspect.expenses.forEach((expense) => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><strong>${expense.description}</strong></td>
            <td><span class="category-tag tag-${expense.category}">${expense.category}</span></td>
            <td>${new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
            <td><strong>₹${parseFloat(expense.amount).toLocaleString('en-IN')}</strong></td>
          `;
          dom.adminUserExpensesTable.appendChild(row);
        });
      }
    }
  }

  function renderAdminDashboard() {
    if (!dom.adminTotalUsers || !dom.adminTotalWealth || !dom.adminAvgSavings || !dom.adminInspectSelect) return;

    const clientUsers = store.state.accounts.filter((account) => account.role === 'user');
    dom.adminTotalUsers.textContent = clientUsers.length;

    let totalPortfolioValue = 0;
    clientUsers.forEach((user) => {
      (user.investments || []).forEach((investment) => {
        totalPortfolioValue += calculateInvestmentValue(investment).currentValue;
      });
    });

    dom.adminTotalWealth.textContent = formatCurrency(totalPortfolioValue);
    dom.adminAvgSavings.textContent = formatCurrency(clientUsers.length > 0 ? totalPortfolioValue / clientUsers.length : 0);

    const previousSelection = dom.adminInspectSelect.value;
    dom.adminInspectSelect.innerHTML = '<option value="" disabled selected>-- Select a User to Inspect --</option>';

    clientUsers.forEach((user) => {
      const option = document.createElement('option');
      option.value = user.username;
      option.textContent = `${user.username} (${user.role})`;
      dom.adminInspectSelect.appendChild(option);
    });

    if (previousSelection) {
      dom.adminInspectSelect.value = previousSelection;
      inspectUser(previousSelection);
    }
  }

  function changeUserRole(username, newRole) {
    const { currentUser, accounts } = store.state;
    if (!currentUser || currentUser.role !== 'admin') {
      alert('Unauthorized: Only admins can change user roles.');
      return;
    }

    if (username === 'admin') {
      alert('The primary admin account role cannot be changed.');
      return;
    }

    const target = accounts.find((account) => account.username === username);
    if (!target) {
      alert('User not found.');
      return;
    }

    target.role = newRole;
    saveAccounts();
    renderAdminDashboard();
    inspectUser(username);

    const badge = document.getElementById('adminInspectedRoleBadge');
    if (badge) badge.textContent = newRole;
    const roleSelect = document.getElementById('adminChangeRoleSelect');
    if (roleSelect) roleSelect.value = newRole;
  }

  if (dom.adminInspectSelect) {
    dom.adminInspectSelect.addEventListener('change', (event) => inspectUser(event.target.value));
  }

  window.changeUserRole = changeUserRole;

  return {
    inspectUser,
    renderAdminDashboard,
    changeUserRole
  };
}
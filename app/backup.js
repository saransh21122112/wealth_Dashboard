export function setupBackupHandlers({ dom, store, saveAccounts, renderAll }) {
  if (dom.exportDataBtn) {
    dom.exportDataBtn.addEventListener('click', () => {
      const { currentUser } = store.state;
      if (!currentUser) return;

      const dataString = JSON.stringify({
        income: currentUser.income || [],
        expenses: currentUser.expenses || [],
        investments: currentUser.investments || []
      }, null, 2);

      const link = document.createElement('a');
      link.setAttribute('href', `data:application/json;charset=utf-8,${encodeURIComponent(dataString)}`);
      link.setAttribute('download', `${currentUser.username}-wealth-backup-${new Date().toISOString().split('T')[0]}.json`);
      link.click();
    });
  }

  if (dom.importDataBtn && dom.importFileSelector) {
    dom.importDataBtn.addEventListener('click', () => dom.importFileSelector.click());
    dom.importFileSelector.addEventListener('change', (event) => {
      const file = event.target.files[0];
      const { currentUser } = store.state;
      if (!file || !currentUser) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        try {
          const data = JSON.parse(loadEvent.target.result);
          if (!Array.isArray(data.expenses) || !Array.isArray(data.investments)) {
            alert('Invalid backup format. Dataset keys are missing.');
            return;
          }

          currentUser.income = Array.isArray(data.income) ? data.income : [];
          currentUser.expenses = data.expenses;
          currentUser.investments = data.investments;
          saveAccounts();
          renderAll();
          alert('Ledger imported successfully!');
        } catch (error) {
          alert(`Error parsing JSON backup file: ${error.message}`);
        }
      };
      reader.readAsText(file);
    });
  }

  if (dom.resetDataBtn) {
    dom.resetDataBtn.addEventListener('click', () => {
      const { currentUser } = store.state;
      if (!currentUser) return;
      if (!confirm('Permanently clear all expenses and investments from your current ledger?')) return;

      currentUser.income = [];
      currentUser.expenses = [];
      currentUser.investments = [];
      saveAccounts();
      renderAll();
      alert('Database cleared.');
    });
  }
}
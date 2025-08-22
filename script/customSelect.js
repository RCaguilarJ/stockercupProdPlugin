// Custom select for mobile
// Usage: call createCustomSelect(rounds, selectedRoundId, callback)

function createCustomSelect(rounds, selectedId, onChange) {
  const container = document.getElementById('round-selector-container');
  container.innerHTML = '';

  const label = document.createElement('label');
  label.textContent = 'Select round:';
  label.className = 'round-label';
  container.appendChild(label);

  const selectBox = document.createElement('div');
  selectBox.className = 'custom-select-box';
  selectBox.tabIndex = 0;

  const selected = document.createElement('div');
  selected.className = 'custom-select-selected';
  selected.textContent = rounds.find(r => r.id === selectedId)?.name + ' (' + rounds.find(r => r.id === selectedId)?.date + ')';
  selectBox.appendChild(selected);

  const optionsList = document.createElement('div');
  optionsList.className = 'custom-select-options';
  optionsList.style.display = 'none';

  rounds.forEach(round => {
    const option = document.createElement('div');
    option.className = 'custom-select-option';
    option.textContent = `${round.name} (${round.date})`;
    option.dataset.value = round.id;
    option.onclick = () => {
      selected.textContent = option.textContent;
      optionsList.style.display = 'none';
      onChange(round.id);
    };
    optionsList.appendChild(option);
  });

  selected.onclick = () => {
    optionsList.style.display = optionsList.style.display === 'none' ? 'block' : 'none';
  };

  selectBox.appendChild(optionsList);
  container.appendChild(selectBox);
}

// Example usage (replace your roundSelect logic with this on mobile):
// createCustomSelect(rounds, selectedRoundId, (id) => { selectedRoundId = id; renderLeaderboard(id); });

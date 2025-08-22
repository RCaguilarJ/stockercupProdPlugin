document.addEventListener('DOMContentLoaded', () => {
  // Pobla el selector de rondas y muestra la más reciente por defecto
  function loadRounds() {
    roundSelect.innerHTML = '';
    rounds.forEach(round => {
      const option = document.createElement('option');
      option.value = round.id;
      option.textContent = `${round.name} (${round.date})`;
      roundSelect.appendChild(option);
    });
    // Selecciona la más reciente
    roundSelect.value = selectedRoundId;
    renderLeaderboard(selectedRoundId);
  }
  const list = document.getElementById('leaderboard-list');
  const loader = document.getElementById('loader');
  const snackbar = document.getElementById('snackbar');

  // NUEVO: Elementos del selector y botón
  const roundSelect = document.getElementById('round-select');
  const viewResultsBtn = document.getElementById('view-results-btn');

  // Rondas y endpoints
  // Usar solo el endpoint local PHP
  const proxyEndpoint = 'api/api_proxy.php';
  let rounds = [
    { id: '10733997704590933397', name: 'Round 1', date: '2024-10-17' },
    { id: '10733997711201156502', name: 'Round 2', date: '2024-10-18' },
    { id: '10733997716737637783', name: 'Round 3', date: '2024-10-19' }
  ];
  let selectedRoundId = rounds[rounds.length - 1].id;

  function showLoader() {
    loader.style.display = 'block';
  }

  function hideLoader() {
    loader.style.display = 'none';
  }

  function formatHour(date) {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  function showSnackbar(message) {
    snackbar.textContent = message;
    snackbar.classList.add('show');
    setTimeout(() => {
      snackbar.classList.remove('show');
    }, 3000);
  }

  async function renderLeaderboard(roundId) {
    const start = Date.now();
    showLoader();

    const previousScores = {};
    document.querySelectorAll('.leaderboard-card').forEach(card => {
      const name = card.querySelector('.name')?.textContent?.trim();
      const score = card.querySelector('.score')?.textContent?.trim();
      if (name && score) previousScores[name] = score;
    });

    fetch(proxyEndpoint)
      .then(response => response.json())
      .then(data => {
        const results = data.results;
        const photoMap = data.roster;
        list.innerHTML = '';

        results.forEach(player => {
          const cardId = String(player.member_card_id);
          const [lastName = '', firstName = ''] = player.name.split(', ');
          const displayName = `${firstName.charAt(0)}. ${lastName}`.toUpperCase();
          const photoURL = photoMap[cardId]
            ? photoMap[cardId]
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&rounded=true&size=56`;

          // LOG: Mostrar en consola la fuente de la foto
          if (photoMap[cardId] && /^https?:\/\//.test(photoMap[cardId])) {
            console.log(`Foto válida para ${displayName} (${cardId}):`, photoMap[cardId], 'Fuente: API');
          } else if (photoURL && photoURL.includes('ui-avatars.com')) {
            // Extraer inicial del nombre
            const initial = firstName ? firstName.charAt(0).toUpperCase() : (player.name ? player.name.charAt(0).toUpperCase() : '?');
            console.log(`Sin foto válida para ${displayName} (${cardId}), usando avatar generado con inicial '${initial}':`, photoURL, 'Fuente: UI Avatars');
          } else {
            console.log(`Conección invalida para ${displayName} (${cardId}): No se pudo obtener foto ni generar avatar.`);
          }

          let roundData = player.rounds.find(r => r.id == roundId);
          if (!roundData) roundData = player.rounds[player.rounds.length - 1] || {};
          const thru = roundData.thru || '-';
          const score = roundData.score || player.score || '-';

          let scoreClass = 'even';
          if (score.startsWith('-')) scoreClass = 'negative';
          else if (score.startsWith('+')) scoreClass = 'positive';

          const card = document.createElement('div');
          card.className = 'leaderboard-card';
          const isMobile = window.innerWidth < 400;
          card.innerHTML = `
            <div class="card-content">
              <div class="position-box">${player.position}</div>
              <img src="${photoURL}" class="leaderboard-img" alt="Foto de ${displayName}">
              <div class="name">${displayName}</div>
              ${isMobile
                ? `<div class="score-and-thru"><span class="score ${scoreClass}">${score}</span><span class="thru">Thru ${thru}</span></div>`
                : `<span class="score ${scoreClass}">${score}</span><span class="thru">Thru ${thru}</span>`}
            </div>
          `;

          list.appendChild(card);

          const oldScore = previousScores[displayName];
          if (oldScore && oldScore !== score) {
            const el = card.querySelector('.score');
            el.style.transform = 'scale(1.3)';
            setTimeout(() => { el.style.transform = 'scale(1)' }, 3000);
          }
        });
        hideLoader();
      })
      .catch(error => {
        hideLoader();
        console.error('Error loading leaderboard:', error);
        showSnackbar('Error updating leaderboard');
      });
  }

  // Evento del botón
  viewResultsBtn.addEventListener('click', () => {
    selectedRoundId = roundSelect.value;
    renderLeaderboard(selectedRoundId);
  });

  // Inicializar
  loadRounds();
  // Render por defecto (última ronda)
  setTimeout(() => {
    renderLeaderboard(selectedRoundId);
  }, 500);
  setInterval(() => {
    renderLeaderboard(selectedRoundId);
  }, 60000);
  window.addEventListener('resize', () => {
    // Solo reorganiza la estructura visual sin recargar datos
    document.querySelectorAll('.leaderboard-card').forEach(card => {
      const position = card.querySelector('.position-box')?.textContent;
      const img = card.querySelector('.leaderboard-img');
      const name = card.querySelector('.name')?.textContent;
      const scoreEl = card.querySelector('.score');
      const scoreClass = scoreEl?.className.replace('score', '').trim();
      const score = scoreEl?.textContent;
      const thruEl = card.querySelector('.thru');
      const thru = thruEl?.textContent?.replace('Thru ', '');
      const isMobile = window.innerWidth < 400;
      card.innerHTML = `
        <div class="card-content">
          <div class="position-box">${position}</div>
          ${img ? img.outerHTML : ''}
          <div class="name">${name}</div>
          ${isMobile
            ? `<div class="score-and-thru"><span class="score ${scoreClass}">${score}</span><span class="thru">Thru ${thru}</span></div>`
            : `<span class="score ${scoreClass}">${score}</span><span class="thru">Thru ${thru}</span>`}
        </div>
      `;
    });
  });
});

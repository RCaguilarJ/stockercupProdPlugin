// Debug inicial para confirmar que el archivo se carga
console.log('[STOCKERCUP] Script frontend.js cargado correctamente');

document.addEventListener("DOMContentLoaded", () => {
  console.log('[STOCKERCUP] DOMContentLoaded ejecutado');
  
  // Función para esperar a que los elementos existan (con timeout)
  function waitForElements() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 20; // 10 segundos máximo
      
      const checkElements = () => {
        attempts++;
        const loader = document.getElementById("golf-loader")
        const list = document.getElementById("golf-leaderboard-list")
        const golfLeaderboard = window.golfLeaderboard
        
        console.log(`[STOCKERCUP] Intento ${attempts}/${maxAttempts} - Verificando elementos:`, {
          loader: !!loader,
          list: !!list,
          golfLeaderboard: !!golfLeaderboard
        })
        
        if (loader && list && golfLeaderboard) {
          console.log('[STOCKERCUP] ✅ TODOS los elementos encontrados')
          resolve({ loader, list, golfLeaderboard })
        } else if (attempts >= maxAttempts) {
          console.log('[STOCKERCUP] ❌ TIMEOUT - Elementos no encontrados después de 10 segundos')
          reject(new Error('Elementos no encontrados'))
        } else {
          console.log('[STOCKERCUP] ❌ Elementos faltantes, reintentando en 500ms...')
          setTimeout(checkElements, 500) // Reintentar cada 500ms
        }
      }
      checkElements()
    })
  }

  // Verificar que no estamos en modo standalone (conflicto con script.js)
  const roundSelect = document.getElementById('round-select')
  const standaloneList = document.getElementById('leaderboard-list')
  
  console.log('[STOCKERCUP] Verificando modo standalone:', {
    roundSelect: !!roundSelect,
    standaloneList: !!standaloneList
  })
  
  if (roundSelect && standaloneList) {
    console.log('[STOCKERCUP] No ejecutándose - detectado modo standalone, usando script.js')
    return
  }

  // Verificar que este es NUESTRO plugin específico
  const ourContainer = document.querySelector('.golf-leaderboard-container')
  console.log('[STOCKERCUP] Verificando nuestro contenedor:', !!ourContainer)
  
  if (!ourContainer) {
    console.log('[STOCKERCUP] No ejecutándose - contenedor no encontrado')
    return
  }

  console.log('[STOCKERCUP] Iniciando plugin stockercupProdPlugin...')

  // Esperar a que todos los elementos necesarios existan
  waitForElements().then(({ loader, list, golfLeaderboard }) => {
    console.log('[STOCKERCUP] Elementos recibidos del Promise:', {
      loader: loader,
      list: list, 
      golfLeaderboard: golfLeaderboard,
      loaderExists: !!loader,
      listExists: !!list,
      golfLeaderboardExists: !!golfLeaderboard
    })

    // VERIFICACIÓN ADICIONAL: Asegurar que realmente existen
    if (!loader || !list || !golfLeaderboard) {
      console.error('[STOCKERCUP] ❌ FALSO POSITIVO - Los elementos no existen realmente!')
      return
    }

    console.log('[STOCKERCUP] ✅ Verificación doble pasada, iniciando leaderboard')

    // Find the container and snackbar for this specific instance
    const container = loader ? loader.closest('.golf-leaderboard-container') : null
    const snackbar = container ? container.querySelector('.golf-snackbar') : null
    
    console.log('[STOCKERCUP] Container y snackbar:', {
      container: !!container,
      snackbar: !!snackbar
    })
    // Store previous data to detect changes
    let previousDataHash = null

    // Small debounce helper to avoid too many recalculations
    function debounce(fn, wait = 100) {
      let t
      return (...args) => {
        clearTimeout(t)
        t = setTimeout(() => fn.apply(null, args), wait)
      }
    }

    // Function to show snackbar only for this container
    function showSnackbar(message) {
      if (snackbar) {
        // Get current time in HH:MM:SS format
        const now = new Date()
        const timeString = now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
        
        // Show message with timestamp like "Leaderboard updated - 13:43:11"
        snackbar.textContent = `${message} - ${timeString}`
        snackbar.classList.add('show')
        setTimeout(() => {
          snackbar.classList.remove('show')
        }, 3000)
      }
    }

    // Create a simple hash of the data to detect changes
    function createDataHash(results) {
      if (!results || !Array.isArray(results)) return null
      return results.map(player => {
        const roundData = player.rounds[player.rounds.length - 1] || {}
        return `${player.position}-${player.name}-${roundData.score || player.score || '-'}-${roundData.thru || '-'}`
      }).join('|')
    }

  // Limit visible players to 5, then enable scrolling
  const applyScrollAfterFive = debounce(() => {
    if (!list) return

    const cards = list.querySelectorAll(".golf-leaderboard-card")
    if (cards.length === 0) {
      list.style.maxHeight = ""
      list.style.overflowY = ""
      return
    }

    if (cards.length <= 5) {
      // If 5 or fewer, don't constrain height
      list.style.maxHeight = ""
      list.style.overflowY = ""
      return
    }

    // Measure the space from the top of the first card to the bottom of the fifth
    const firstTop = cards[0].offsetTop
    const fifthBottom = cards[4].offsetTop + cards[4].offsetHeight
    const visibleHeight = Math.max(0, fifthBottom - firstTop)

    // Apply max-height so only ~5 cards are visible; scroll to see the rest
    list.style.maxHeight = `${visibleHeight}px`
    list.style.overflowY = "auto"
  }, 80)

  function showLoader() {
    if (loader) loader.style.display = "block"
  }

  function hideLoader() {
    if (loader) loader.style.display = "none"
  }

  function formatName(fullName) {
    const [lastName = "", firstName = ""] = fullName.split(", ")
    return `${firstName.charAt(0)}. ${lastName}`.toUpperCase()
  }

  function renderLeaderboard() {
    showLoader()

    const data = new FormData()
    data.append("action", "get_leaderboard_data")
    data.append("nonce", golfLeaderboard.nonce)

    fetch(golfLeaderboard.ajax_url, {
      method: "POST",
      body: data,
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.results) {
          throw new Error("No data received")
        }

        const results = data.results
        const photoMap = data.roster

        // Check if data has changed
        const currentDataHash = createDataHash(results)
        const hasDataChanged = previousDataHash !== null && previousDataHash !== currentDataHash
        
        // Update previous data hash
        previousDataHash = currentDataHash

        console.log("[v0] Debug info:", data.debug)
        console.log("[v0] Photo map:", photoMap)
        console.log("[v0] Photo debug details:", data.debug.photo_debug)
        console.log("[v0] Roster sample:", data.debug.roster_sample)
        console.log("[v0] First player photo check:", {
          player: results[0]?.name,
          cardId: results[0]?.member_card_id,
          hasPhoto: results[0]?.has_photo,
          photoUrl: results[0]?.photo_url,
        })

        if (list) {
          list.innerHTML = ""

          results.forEach((player, index) => {
            const cardId = String(player.member_card_id)
            const displayName = formatName(player.name)

            let photoURL = photoMap[cardId]

            if (!photoURL) {
              console.log(`[v0] No photo found for ${player.name} (ID: ${cardId})`)
              console.log(`[v0] Available photo map keys:`, Object.keys(photoMap))
              console.log(`[v0] Looking for card ID: "${cardId}" (type: ${typeof cardId})`)

              // Create initials from name for fallback
              const nameParts = player.name.split(", ")
              const lastName = nameParts[0] || ""
              const firstName = nameParts[1] || ""
              const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
              photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=8BC34A&color=fff&rounded=true&size=56`
            } else {
              console.log(`[v0] Photo found for ${player.name}: ${photoURL}`)
            }

            // Get the latest round data
            const roundData = player.rounds[player.rounds.length - 1] || {}
            const thru = roundData.thru || "-"
            const score = roundData.score || player.score || "-"

            let scoreClass = "even"
            if (score.toString().startsWith("-")) scoreClass = "negative"
            else if (score.toString().startsWith("+")) scoreClass = "positive"

            const card = document.createElement("div")
            card.className = "golf-leaderboard-card"

            const isMobile = window.innerWidth < 600
            card.innerHTML = `
                        <div class="card-content">
                            <div class="position-box">${player.position}</div>
                            <img src="${photoURL}" class="leaderboard-img" alt="Photo of ${displayName}" 
                                 onerror="console.log('[v0] Image failed to load:', this.src); this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=95a5a6&color=fff&rounded=true&size=56'"
                                 onload="console.log('[v0] Image loaded successfully:', this.src)">
                            <div class="name">${displayName}</div>
                            ${
                              isMobile
                                ? `<div class="score-and-thru"><span class="score ${scoreClass}">${score}</span><span class="thru">Thru ${thru}</span></div>`
                                : `<span class="score ${scoreClass}">${score}</span><span class="thru">Thru ${thru}</span>`
                            }
                        </div>
                    `

            list.appendChild(card)
          })
          // After rendering cards, enforce scroll-after-5
          // Use rAF to ensure layout is calculated
          requestAnimationFrame(() => applyScrollAfterFive())
        }

        // Show snackbar only if data has changed and it's not the initial load
        if (hasDataChanged) {
          showSnackbar('Leaderboard updated')
        }

        hideLoader()
      })
      .catch((error) => {
        console.error("Error loading leaderboard:", error)
        hideLoader()
        if (list) {
          list.innerHTML =
            '<div style="text-align: center; padding: 20px; color: #e74c3c;">Error loading leaderboard data</div>'
        }
      })
  }

  // Initial load
  renderLeaderboard()


  // Handle window resize for responsive layout
  window.addEventListener("resize", () => {
    // Re-render cards for mobile/desktop layout
    const cards = document.querySelectorAll(".golf-leaderboard-card")
    cards.forEach((card) => {
      const position = card.querySelector(".position-box")?.textContent
      const img = card.querySelector(".leaderboard-img")
      const name = card.querySelector(".name")?.textContent
      const scoreEl = card.querySelector(".score")
      const scoreClass = scoreEl?.className.replace("score", "").trim()
      const score = scoreEl?.textContent
      const thruEl = card.querySelector(".thru")
      const thru = thruEl?.textContent?.replace("Thru ", "")

      const isMobile = window.innerWidth < 600
      card.innerHTML = `
                <div class="card-content">
                    <div class="position-box">${position}</div>
                    ${img ? img.outerHTML : ""}
                    <div class="name">${name}</div>
                    ${
                      isMobile
                        ? `<div class="score-and-thru"><span class="score ${scoreClass}">${score}</span><span class="thru">Thru ${thru}</span></div>`
                        : `<span class="score ${scoreClass}">${score}</span><span class="thru">Thru ${thru}</span>`
                    }
                </div>
            `
    })
    // Recalculate the constraint on resize
    applyScrollAfterFive()
  })

  // Recalculate when images inside the list finish loading (captures image load events)
  if (list) {
    list.addEventListener(
      "load",
      (e) => {
        if (e.target && e.target.tagName === "IMG") {
          applyScrollAfterFive()
        }
      },
      true // use capture to catch IMG load events
    )

    // Observe DOM changes to re-apply when cards are added/removed
    const observer = new MutationObserver(() => applyScrollAfterFive())
    observer.observe(list, { childList: true, subtree: true })
  }
  
  }) // Cierre del Promise.then()
  .catch(error => {
    console.error('[STOCKERCUP] Error esperando elementos:', error)
  })
})

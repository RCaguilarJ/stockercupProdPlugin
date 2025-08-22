document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("golf-loader")
  const list = document.getElementById("golf-leaderboard-list")
  const golfLeaderboard = window.golfLeaderboard // Declare the variable here

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

  // Auto-refresh every minute
  setInterval(renderLeaderboard, 60000)

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
  })
})

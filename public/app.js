const selectors = {
  form: document.getElementById("search-form"),
  input: document.getElementById("city-input"),
  status: document.getElementById("status-message"),
  results: document.getElementById("results"),
};

const formatDate = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const escapeHtml = (unsafe = "") =>
  unsafe.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#039;";
      default:
        return char;
    }
  });

selectors.form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const city = selectors.input.value.trim();
  if (!city) {
    setStatus("Please enter a city name.", "error");
    return;
  }

  try {
    toggleFormDisabled(true);
    setStatus("Searching for fresh air data…", "info");

    const response = await fetch(`/api/aqi?city=${encodeURIComponent(city)}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error ?? "Unable to fetch AQI data.");
    }

    renderResults(payload.data);
    setStatus("Success! Cached results will make repeat searches instant.", "success");
  } catch (error) {
    console.error(error);
    selectors.results.classList.add("hidden");
    selectors.results.innerHTML = "";
    setStatus(error.message ?? "Something went wrong.", "error");
  } finally {
    toggleFormDisabled(false);
  }
});

function toggleFormDisabled(disabled) {
  selectors.input.disabled = disabled;
  selectors.form.querySelector("button").disabled = disabled;
}

function setStatus(message, variant) {
  selectors.status.textContent = message;
  selectors.status.dataset.variant = variant;
}

function renderResults(summary) {
  selectors.results.classList.remove("hidden");

  const location =
    summary.coordinates?.lat && summary.coordinates?.lon
      ? `${summary.coordinates.lat.toFixed(2)}, ${summary.coordinates.lon.toFixed(2)}`
      : "Unknown";

  const attributionHtml =
    summary.attribution?.length > 0
      ? summary.attribution
          .map(
            (attrib) =>
              `<li><a href="${attrib.url}" target="_blank" rel="noreferrer">${escapeHtml(attrib.name)}</a></li>`,
          )
          .join("")
      : "<li>No attribution data provided.</li>";

  const readings = (summary.readings ?? []).slice(0, 8);
  const readingsHtml =
    readings.length > 0
      ? readings
          .map(
            (reading) => `
              <div class="reading">
                <span class="badge">${escapeHtml(reading.pollutant.toUpperCase())}</span>
                <strong>${reading.value}</strong>
              </div>
            `,
          )
          .join("")
      : "<p>No pollutant breakdown available.</p>";

  const forecast = (summary.forecast ?? []).slice(0, 6);
  const forecastHtml =
    forecast.length > 0
      ? `
          <article class="card">
            <h3>Daily forecast</h3>
            <div class="forecast-list">
              ${forecast
                .map(
                  (item) => `
                    <div class="forecast-item">
                      <p class="badge">${escapeHtml(item.pollutant.toUpperCase())}</p>
                      <p><strong>${item.day}</strong></p>
                      <p>Avg ${item.avg} · Min ${item.min} · Max ${item.max}</p>
                    </div>
                  `,
                )
                .join("")}
            </div>
          </article>
        `
      : "";

  selectors.results.innerHTML = `
    <article class="card">
      <h2>${escapeHtml(summary.city)}</h2>
      <p class="aqi-tag">AQI <strong>${summary.aqi ?? "N/A"}</strong></p>
      <p>Dominant pollutant: <strong>${escapeHtml(summary.dominantPollutant ?? "Unknown")}</strong></p>
      <p>Last updated: ${formatDate(summary.updatedAt)}</p>
      <p>Location: ${location}</p>
      ${
        summary.sourceUrl
          ? `<p>Source: <a href="${summary.sourceUrl}" target="_blank" rel="noreferrer">${summary.sourceUrl}</a></p>`
          : ""
      }
    </article>

    <article class="card">
      <h3>Pollutant breakdown</h3>
      <div class="grid two-columns">
        ${readingsHtml}
      </div>
    </article>

    <article class="card">
      <h3>Attribution</h3>
      <ul>
        ${attributionHtml}
      </ul>
    </article>

    ${forecastHtml}
  `;
}


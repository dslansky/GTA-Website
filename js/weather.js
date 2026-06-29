/* Greentree Acres — Weather (Open-Meteo, Ferndale NY 12734) */
(function () {
  var LAT = 41.7406;
  var LON = -74.7474;
  var CACHE_KEY = 'gta-weather-v1';
  var CACHE_TTL_MS = 30 * 60 * 1000;

  var URL = 'https://api.open-meteo.com/v1/forecast' +
    '?latitude=' + LAT + '&longitude=' + LON +
    '&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset' +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=7';

  function codeInfo(code) {
    if (code === 0) return { icon: '☀️', label: 'Clear' };
    if (code === 1) return { icon: '🌤️', label: 'Mostly Clear' };
    if (code === 2) return { icon: '⛅', label: 'Partly Cloudy' };
    if (code === 3) return { icon: '☁️', label: 'Cloudy' };
    if (code === 45 || code === 48) return { icon: '🌫️', label: 'Foggy' };
    if (code >= 51 && code <= 57) return { icon: '🌦️', label: 'Drizzle' };
    if (code >= 61 && code <= 67) return { icon: '🌧️', label: 'Rain' };
    if (code >= 71 && code <= 77) return { icon: '🌨️', label: 'Snow' };
    if (code >= 80 && code <= 82) return { icon: '🌧️', label: 'Showers' };
    if (code === 85 || code === 86) return { icon: '🌨️', label: 'Snow Showers' };
    if (code === 95) return { icon: '⛈️', label: 'Thunderstorm' };
    if (code === 96 || code === 99) return { icon: '⛈️', label: 'T-Storm + Hail' };
    return { icon: '🌡️', label: '—' };
  }

  function dayName(iso) {
    var d = new Date(iso + 'T12:00:00');
    var today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    var tomorrow = new Date(today.getTime() + 86400000);
    if (d.toDateString() === tomorrow.toDateString()) return 'Tom';
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }

  function formatTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function renderNav(data) {
    var el = document.getElementById('nav-weather');
    if (!el || !data || !data.current) return;
    var info = codeInfo(data.current.weather_code);
    var temp = Math.round(data.current.temperature_2m);
    el.innerHTML = '<a href="local.html#weather" class="nav-weather-link" aria-label="' + info.label + ', ' + temp + '°F">' +
      '<span class="nav-weather-icon">' + info.icon + '</span>' +
      '<span class="nav-weather-temp">' + temp + '°</span>' +
    '</a>';
  }

  function renderWidget(data) {
    var el = document.getElementById('weather-widget');
    if (!el || !data) return;
    var c = data.current || {};
    var ci = codeInfo(c.weather_code);
    var d = data.daily || {};

    var days = '';
    if (d.time) {
      for (var i = 0; i < d.time.length; i++) {
        var di = codeInfo(d.weather_code[i]);
        var pop = d.precipitation_probability_max ? d.precipitation_probability_max[i] : null;
        days += '<div class="wx-day">' +
          '<div class="wx-day-name">' + dayName(d.time[i]) + '</div>' +
          '<div class="wx-day-icon">' + di.icon + '</div>' +
          '<div class="wx-day-temps">' +
            '<span class="wx-hi">' + Math.round(d.temperature_2m_max[i]) + '°</span>' +
            '<span class="wx-lo">' + Math.round(d.temperature_2m_min[i]) + '°</span>' +
          '</div>' +
          (pop != null && pop > 0 ? '<div class="wx-pop">💧 ' + pop + '%</div>' : '<div class="wx-pop">&nbsp;</div>') +
        '</div>';
      }
    }

    var sunriseT = d.sunrise ? formatTime(d.sunrise[0]) : '';
    var sunsetT = d.sunset ? formatTime(d.sunset[0]) : '';

    el.innerHTML =
      '<div class="wx-current">' +
        '<div class="wx-current-main">' +
          '<span class="wx-current-icon">' + ci.icon + '</span>' +
          '<div class="wx-current-text">' +
            '<div class="wx-current-temp">' + Math.round(c.temperature_2m) + '°<span class="wx-unit">F</span></div>' +
            '<div class="wx-current-label">' + ci.label + ' · Feels ' + Math.round(c.apparent_temperature) + '°</div>' +
          '</div>' +
        '</div>' +
        '<div class="wx-current-meta">' +
          '<span>💧 ' + Math.round(c.relative_humidity_2m) + '%</span>' +
          '<span>💨 ' + Math.round(c.wind_speed_10m) + ' mph</span>' +
          (sunriseT ? '<span>🌅 ' + sunriseT + '</span>' : '') +
          (sunsetT ? '<span>🌇 ' + sunsetT + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="wx-forecast">' + days + '</div>';
  }

  function render(data) {
    renderNav(data);
    renderWidget(data);
  }

  function loadCached() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (Date.now() - obj.t > CACHE_TTL_MS) return null;
      return obj.d;
    } catch (e) { return null; }
  }

  function saveCached(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: data })); } catch (e) {}
  }

  var cached = loadCached();
  if (cached) render(cached);

  fetch(URL)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      saveCached(data);
      render(data);
    })
    .catch(function () {
      if (!cached) {
        var nav = document.getElementById('nav-weather');
        if (nav) nav.innerHTML = '';
        var w = document.getElementById('weather-widget');
        if (w) w.innerHTML = '<p class="wx-err">Weather unavailable.</p>';
      }
    });
})();

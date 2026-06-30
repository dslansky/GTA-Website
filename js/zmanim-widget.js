/* Greentree Acres — Today's Zmanim (compact home page widget) */
(function () {
  function todayNY() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
  }

  function formatTime(iso) {
    if (!iso || typeof iso !== 'string' || !iso.includes('T')) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York'
    });
  }

  function firstTime(times, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = times[keys[i]];
      var raw = v && typeof v === 'object' && 'value' in v ? v.value : v;
      var t = formatTime(raw);
      if (t) return t;
    }
    return null;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render(zm, conv) {
    var el = document.getElementById('today-zmanim');
    if (!el) return;
    var times = zm.times || {};
    var shkia = firstTime(times, ['shkia', 'sunset', 'dusk']);
    var tzeit = firstTime(times, ['tzeit', 'tzeit85deg', 'tzeit72min', 'tzaisBaalHatanya', 'tzeit50min', 'tzeit42min']);
    var hebrew = conv && conv.hebrew ? esc(conv.hebrew) : '';

    el.innerHTML =
      '<span class="today-card-icon">🕯️</span>' +
      '<div class="today-card-body">' +
        '<p class="today-card-eyebrow">' + (hebrew || 'Zmanim') + '</p>' +
        '<h3>Shkiah ' + (shkia ? esc(shkia) : '—') + '</h3>' +
        '<p class="today-card-detail">' + (tzeit ? 'Tzeit ' + esc(tzeit) : '') + '</p>' +
      '</div>';
  }

  var date = todayNY();
  var parts = date.split('-');
  var y = parts[0], m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);

  Promise.all([
    fetch('https://www.hebcal.com/zmanim?cfg=json&geo=zip&zip=12734&tzid=America%2FNew_York&date=' + date),
    fetch('https://www.hebcal.com/converter?cfg=json&gy=' + y + '&gm=' + m + '&gd=' + d + '&g2h=1')
  ]).then(function (responses) {
    return Promise.all(responses.map(function (r) { return r.json(); }));
  }).then(function (data) {
    render(data[0], data[1]);
  }).catch(function () {});
})();

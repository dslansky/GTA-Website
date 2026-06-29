/* Greentree Acres — Pool Hours 2026 */
(function () {
  var SCHEDULE = {
    'mon-thu': [
      { start: [10, 0],  end: [12, 30], group: 'Ladies' },
      { start: [12, 30], end: [13, 30], group: 'Men' },
      { start: [13, 30], end: [17, 15], group: 'Ladies' },
      { start: [17, 15], end: [18, 15], group: 'Men' }
    ],
    'fri': [
      { start: [10, 0],  end: [12, 0],  group: 'Ladies' },
      { start: [12, 0],  end: [13, 30], group: 'Men' },
      { start: [13, 30], end: [16, 0],  group: 'Ladies' },
      { start: [16, 0],  end: [18, 0],  group: 'Men' }
    ],
    'sun': [
      { start: [10, 0],  end: [12, 30], group: 'Ladies' },
      { start: [12, 30], end: [15, 0],  group: 'Men' },
      { start: [15, 0],  end: [17, 0],  group: 'Ladies' },
      { start: [17, 0],  end: [18, 30], group: 'Men' }
    ]
  };

  var DAY_LABELS = {
    'sun':     'Sunday',
    'mon-thu': 'Monday – Thursday',
    'fri':     'Friday',
    'sat':     'Saturday (Shabbos)'
  };

  function nyParts() {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: false
    });
    var parts = fmt.formatToParts(new Date());
    var obj = {};
    parts.forEach(function (p) { obj[p.type] = p.value; });
    var dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      day: dayMap[obj.weekday],
      hour: parseInt(obj.hour, 10) === 24 ? 0 : parseInt(obj.hour, 10),
      min: parseInt(obj.minute, 10)
    };
  }

  function dayKey(d) {
    if (d === 0) return 'sun';
    if (d === 5) return 'fri';
    if (d === 6) return 'sat';
    return 'mon-thu';
  }

  function toMin(h, m) { return h * 60 + m; }

  function fmt12(h, m) {
    var ampm = h >= 12 ? 'pm' : 'am';
    var hh = h % 12; if (hh === 0) hh = 12;
    return m === 0 ? hh + ampm : hh + ':' + String(m).padStart(2, '0') + ampm;
  }

  function currentStatus() {
    var t = nyParts();
    var key = dayKey(t.day);
    if (key === 'sat') return { open: false, label: 'Closed', detail: 'Shabbos', icon: '🌅', tone: 'closed' };

    var slots = SCHEDULE[key];
    var now = toMin(t.hour, t.min);

    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      var start = toMin(s.start[0], s.start[1]);
      var end   = toMin(s.end[0],   s.end[1]);
      if (now >= start && now < end) {
        return {
          open: true,
          label: s.group,
          detail: 'until ' + fmt12(s.end[0], s.end[1]),
          icon: '🏊',
          tone: 'open'
        };
      }
    }
    for (var j = 0; j < slots.length; j++) {
      var s2 = slots[j];
      var st = toMin(s2.start[0], s2.start[1]);
      if (now < st) {
        return {
          open: false,
          label: 'Closed',
          detail: s2.group + ' at ' + fmt12(s2.start[0], s2.start[1]),
          icon: '🚫',
          tone: 'closed'
        };
      }
    }
    return { open: false, label: 'Closed', detail: 'Closed for today', icon: '🌙', tone: 'closed' };
  }

  function renderNav() {
    var el = document.getElementById('nav-pool');
    if (!el) return;
    var s = currentStatus();
    el.innerHTML = '<button type="button" class="nav-pool-link nav-pool-' + s.tone + '" data-pool-open aria-label="Pool: ' + s.label + ' ' + s.detail + '">' +
      '<span class="nav-pool-icon">' + s.icon + '</span>' +
      '<span class="nav-pool-text">' + s.label + '</span>' +
    '</button>';
    el.querySelector('[data-pool-open]').addEventListener('click', openModal);
  }

  function buildScheduleHtml() {
    var keys = ['sun', 'mon-thu', 'fri', 'sat'];
    return keys.map(function (k) {
      var slots = SCHEDULE[k];
      var rows;
      if (!slots) {
        rows = '<li class="pool-slot pool-slot-closed"><span class="pool-slot-time">All day</span><span class="pool-slot-group">Closed (Shabbos)</span></li>';
      } else {
        rows = slots.map(function (s) {
          var range = fmt12(s.start[0], s.start[1]) + ' – ' + fmt12(s.end[0], s.end[1]);
          var cls = s.group === 'Ladies' ? 'pool-slot-ladies' : 'pool-slot-men';
          return '<li class="pool-slot ' + cls + '"><span class="pool-slot-time">' + range + '</span><span class="pool-slot-group">' + s.group + '</span></li>';
        }).join('');
      }
      return '<div class="pool-day"><h4>' + DAY_LABELS[k] + '</h4><ul>' + rows + '</ul></div>';
    }).join('');
  }

  function openModal() {
    var modal = document.getElementById('pool-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pool-modal';
      modal.className = 'pool-modal-overlay';
      modal.innerHTML =
        '<div class="pool-modal" role="dialog" aria-modal="true" aria-labelledby="pool-modal-title">' +
          '<div class="pool-modal-header">' +
            '<h3 id="pool-modal-title">Pool Hours 2026</h3>' +
            '<button class="pool-modal-close" aria-label="Close">&times;</button>' +
          '</div>' +
          '<div class="pool-current" id="pool-current"></div>' +
          '<div class="pool-schedule">' + buildScheduleHtml() + '</div>' +
          '<div class="pool-safety">' +
            '<h4>Pool Safety</h4>' +
            '<ul>' +
              '<li><strong>Ladies hours:</strong> Lifeguard on duty — <strong>Sarah Zelmanowitz, Bungalow 40</strong>.</li>' +
              '<li><strong>Men hours:</strong> No lifeguard. <strong>Two adults must be present at all times</strong> — swim at your own risk.</li>' +
              '<li>Children must be supervised by a responsible adult at all times.</li>' +
              '<li>No diving. No running on the pool deck.</li>' +
              '<li>Do not swim alone or while impaired.</li>' +
              '<li>Obey posted rules and pool gates.</li>' +
            '</ul>' +
          '</div>' +
          '<div class="pool-emergency">' +
            '<div class="pool-emergency-label">Emergency</div>' +
            '<div class="pool-emergency-actions">' +
              '<a href="tel:911" class="pool-emergency-btn pool-emergency-911">' +
                '<span>📞</span> Call 911' +
              '</a>' +
              '<a href="tel:+17183871750" class="pool-emergency-btn pool-emergency-hatzalah">' +
                '<span>🚑</span> Hatzalah · (718) 387-1750' +
              '</a>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);

      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.classList.contains('pool-modal-close')) closeModal();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
      });
    }

    var s = currentStatus();
    var currentEl = modal.querySelector('#pool-current');
    currentEl.className = 'pool-current pool-current-' + s.tone;
    currentEl.innerHTML =
      '<span class="pool-current-icon">' + s.icon + '</span>' +
      '<div class="pool-current-text">' +
        '<div class="pool-current-label">' + (s.open ? s.label + ' swimming now' : s.label) + '</div>' +
        '<div class="pool-current-detail">' + (s.detail || '') + '</div>' +
      '</div>';

    requestAnimationFrame(function () { modal.classList.add('open'); });
  }

  function closeModal() {
    var modal = document.getElementById('pool-modal');
    if (modal) modal.classList.remove('open');
  }

  renderNav();
  setInterval(renderNav, 60000);
})();

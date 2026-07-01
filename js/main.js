/* =========================================
   Greentree Acres — main.js
   ========================================= */

// ── Nav scroll behavior ──
const nav = document.getElementById('nav');
const heroEl = document.getElementById('hero');

function updateNav() {
  if (window.scrollY > 40) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

// ── Kick off hero subtle zoom ──
window.addEventListener('load', () => {
  heroEl && heroEl.classList.add('loaded');
});

// ── Mobile nav toggle ──
const navToggle = document.getElementById('navToggle');
navToggle && navToggle.addEventListener('click', () => {
  nav.classList.toggle('nav-open');
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => nav.classList.remove('nav-open'));
});

document.addEventListener('click', (e) => {
  if (nav.classList.contains('nav-open') && !nav.contains(e.target)) {
    nav.classList.remove('nav-open');
  }
});

// ── Scroll reveal ──
const revealEls = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach(el => observer.observe(el));

// ── Video modal ──
const videoModal = document.getElementById('video-modal');
const videoIframe = document.getElementById('video-modal-iframe');

function openVideo(videoId) {
  videoIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  videoModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeVideo() {
  videoModal.classList.remove('open');
  videoIframe.src = '';
  document.body.style.overflow = '';
}

// Delegated click so dynamically-added cards (live YouTube feed) also work
document.addEventListener('click', e => {
  if (!videoModal) return;
  const card = e.target.closest('.video-card');
  if (card && card.dataset.videoId) openVideo(card.dataset.videoId);
});

document.getElementById('video-modal-close') && document.getElementById('video-modal-close').addEventListener('click', closeVideo);

videoModal && videoModal.addEventListener('click', e => {
  if (e.target === videoModal) closeVideo();
});

document.addEventListener('keydown', e => {
  if (videoModal && videoModal.classList.contains('open') && e.key === 'Escape') closeVideo();
});

// ── Lightbox ──
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const galleryItems = Array.from(document.querySelectorAll('.gallery-item[data-src]'));
let currentIndex = 0;

function openLightbox(index) {
  if (!galleryItems[index]) return;
  currentIndex = index;
  lightboxImg.src = galleryItems[index].dataset.src;
  lightboxImg.alt = galleryItems[index].dataset.alt || '';
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function prevImage() {
  currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
  lightboxImg.src = galleryItems[currentIndex].dataset.src;
}

function nextImage() {
  currentIndex = (currentIndex + 1) % galleryItems.length;
  lightboxImg.src = galleryItems[currentIndex].dataset.src;
}

galleryItems.forEach((item, i) => {
  item.addEventListener('click', () => openLightbox(i));
});

document.getElementById('lightbox-close') && document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox-prev') && document.getElementById('lightbox-prev').addEventListener('click', prevImage);
document.getElementById('lightbox-next') && document.getElementById('lightbox-next').addEventListener('click', nextImage);

lightbox && lightbox.addEventListener('click', e => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', e => {
  if (!lightbox || !lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') prevImage();
  if (e.key === 'ArrowRight') nextImage();
});

// ── PWA: register service worker ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ── Push notifications ──
(function () {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const SUBSCRIBED_KEY = 'gta-push-subscribed';
  const DISMISSED_KEY  = 'gta-push-dismissed';

  function b64urlToUint8(s) {
    s = (s + '==='.slice(s.length % 4 + 1)).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function subscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch('/push/vapid-key');
      const vapidPub = (await keyRes.text()).trim();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64urlToUint8(vapidPub),
      });
      const res = await fetch('/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error('subscribe failed');
      localStorage.setItem(SUBSCRIBED_KEY, '1');
      return true;
    } catch (e) {
      return false;
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      localStorage.removeItem(SUBSCRIBED_KEY);
    } catch {}
  }

  // Expose for manual buttons
  window.GTANotify = {
    subscribe,
    unsubscribe,
    async status() {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return {
        permission: Notification.permission,
        subscribed: !!sub,
      };
    }
  };

  // Auto-prompt on first run (after install on iOS; first visit on Android/desktop)
  (async function maybePromptAuto() {
    if (localStorage.getItem(SUBSCRIBED_KEY)) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (Notification.permission === 'denied') return;

    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    // iOS push only works when installed
    if (isIOS && !isStandalone) return;

    // Wait 4s so user sees site first
    setTimeout(showPrompt, 4000);
  })();

  function showPrompt() {
    if (localStorage.getItem(SUBSCRIBED_KEY) || localStorage.getItem(DISMISSED_KEY)) return;
    const banner = document.createElement('div');
    banner.id = 'push-prompt';
    banner.innerHTML =
      '<div class="push-prompt-inner">' +
        '<div class="push-prompt-text">' +
          '<strong>Get colony updates</strong>' +
          '<span>Pool hours, weather, events, Shabbos zmanim.</span>' +
        '</div>' +
        '<div class="push-prompt-actions">' +
          '<button type="button" class="push-prompt-btn push-prompt-yes">Enable</button>' +
          '<button type="button" class="push-prompt-btn push-prompt-no">Not now</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);

    banner.querySelector('.push-prompt-no').addEventListener('click', () => {
      localStorage.setItem(DISMISSED_KEY, '1');
      banner.remove();
    });
    banner.querySelector('.push-prompt-yes').addEventListener('click', async () => {
      const btn = banner.querySelector('.push-prompt-yes');
      btn.disabled = true; btn.textContent = '…';
      const ok = await subscribe();
      banner.remove();
      if (ok) {
        const t = document.createElement('div');
        t.id = 'push-toast';
        t.textContent = '✓ Notifications enabled';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3500);
      }
    });
  }

  // Wire up any manual buttons on page
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-push-toggle]');
    if (!btn) return;
    e.preventDefault();
    const status = await window.GTANotify.status();
    if (status.subscribed) {
      await unsubscribe();
      btn.textContent = btn.dataset.labelOff || 'Enable notifications';
    } else {
      btn.disabled = true; btn.textContent = '…';
      const ok = await subscribe();
      btn.disabled = false;
      btn.textContent = ok ? (btn.dataset.labelOn || '✓ Notifications enabled') : 'Enable notifications';
    }
  });

  // Reflect current state on any manual buttons on page load
  window.addEventListener('load', async () => {
    const btns = document.querySelectorAll('[data-push-toggle]');
    if (!btns.length) return;
    const status = await window.GTANotify.status();
    btns.forEach(b => {
      b.textContent = status.subscribed
        ? (b.dataset.labelOn || '✓ Notifications enabled — tap to disable')
        : (b.dataset.labelOff || 'Enable notifications');
    });
  });
})();

// ── iOS Add-to-Home-Screen hint ──
(function () {
  const ua = window.navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isStandalone = window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  const dismissed = localStorage.getItem('gta-pwa-hint-dismissed');
  if (!isIOS || isStandalone || dismissed) return;

  setTimeout(() => {
    const banner = document.createElement('div');
    banner.id = 'pwa-hint';
    banner.innerHTML =
      '<div class="pwa-hint-inner">' +
        '<div class="pwa-hint-text">' +
          '<strong>Add to Home Screen</strong>' +
          '<span>Tap <svg width="13" height="16" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin:0 2px"><path d="M6.5 1v9M3 4.5L6.5 1 10 4.5M2 8v6h9V8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg> then <em>Add to Home Screen</em></span>' +
        '</div>' +
        '<button class="pwa-hint-close" aria-label="Dismiss">&times;</button>' +
      '</div>';
    document.body.appendChild(banner);
    banner.querySelector('.pwa-hint-close').addEventListener('click', () => {
      banner.remove();
      localStorage.setItem('gta-pwa-hint-dismissed', '1');
    });
  }, 2500);
})();

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

document.querySelectorAll('.video-card').forEach(card => {
  card.addEventListener('click', () => openVideo(card.dataset.videoId));
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

/**
 * ravitejabitra.in - Minimalist Script
 * Includes themed page transition engine for all activity cards
 */

// =========================================================================
// PAGE TRANSITION ENGINE
// =========================================================================
const TRANSITION_KEY = 'page-transition';

// Map of page filenames to their enter animation class
const transitionMap = {
  'strength.html': 'enter-strength',
  'running.html':  'enter-running',
  'cycling.html':  'enter-cycling',
  'swimming.html': 'enter-swimming',
  'badminton.html':'enter-badminton',
  'travel.html':   'enter-travel',
  'mindset.html':  'enter-mindset',
  'nutrition.html':'enter-nutrition',
  'motivation.html':'enter-motivation',
  'index.html':    'page-enter',
  '':              'page-enter', // root
};

function getPageKey(href) {
  try {
    const url = new URL(href, window.location.href);
    const filename = url.pathname.split('/').pop() || '';
    return filename;
  } catch { return ''; }
}

function navigateWithTransition(href) {
  const pageKey = getPageKey(href);
  const enterClass = transitionMap[pageKey] || 'page-enter';

  // Store the animation class for the next page
  sessionStorage.setItem(TRANSITION_KEY, enterClass);

  // Play exit animation, then navigate
  document.body.classList.add('page-exit');
  setTimeout(() => {
    window.location.href = href;
  }, 380);
}

// Intercept all activity card clicks
function initTransitionLinks() {
  document.querySelectorAll('.activity-card, .back-btn').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateWithTransition(href);
    });
  });
}

// Apply entrance animation on page load
function applyEntranceAnimation() {
  const enterClass = sessionStorage.getItem(TRANSITION_KEY);
  if (enterClass) {
    sessionStorage.removeItem(TRANSITION_KEY);
    document.body.classList.add(enterClass);
    // Clean up after animation completes
    document.body.addEventListener('animationend', () => {
      document.body.classList.remove(enterClass);
    }, { once: true });
  }
}

// =========================================================================
// DOM READY
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {

  // Apply page entrance animation immediately
  applyEntranceAnimation();

  // Init transition links
  initTransitionLinks();

  // =========================================================================
  // 1. Header Scroll Effect
  // =========================================================================
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('header-scrolled');
      } else {
        header.classList.remove('header-scrolled');
      }
    });
  }

  // =========================================================================
  // 2. Mobile Navigation Toggle
  // =========================================================================
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('open');
      navLinks.classList.toggle('active');
    });

    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('open');
        navLinks.classList.remove('active');
      });
    });
  }

  // =========================================================================
  // 3. Contact Form Handling
  // =========================================================================
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;

      btn.textContent = 'Sending...';
      btn.disabled = true;

      setTimeout(() => {
        btn.textContent = 'Message Sent!';
        contactForm.reset();

        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 3000);
      }, 1500);
    });
  }
});

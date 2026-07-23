/**
 * ravitejabitra.in - Interactive Ambient & Card Spotlight Engine
 */

document.addEventListener('DOMContentLoaded', () => {

  const aura = document.getElementById('ambient-aura');
  const cards = document.querySelectorAll('.activity-card');

  // Discipline aura color mapping
  const auraColors = {
    strength:   'rgba(245, 158, 11, 0.22)',  /* Iron Amber Gold */
    running:    'rgba(217, 249, 93, 0.22)',  /* Electric Lime */
    cycling:    'rgba(6, 182, 212, 0.22)',   /* Velocity Cyan */
    swimming:   'rgba(56, 189, 248, 0.22)',  /* Hydro Ocean Blue */
    badminton:  'rgba(244, 63, 94, 0.22)',   /* Smash Rose Crimson */
    travel:     'rgba(168, 85, 247, 0.22)',  /* Aurora Violet */
    nutrition:  'rgba(16, 185, 129, 0.22)',  /* Vitality Emerald */
    mindset:    'rgba(139, 92, 246, 0.22)',  /* Cosmic Indigo */
    motivation: 'rgba(234, 179, 8, 0.22)'    /* Solar Gold Spotlight */
  };

  // 1. Interactive Mouse Tracking & Ambient Aura Shift
  if (cards.length > 0) {
    cards.forEach(card => {

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Set card internal spotlight coordinates
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        // Move and color ambient aura
        if (aura) {
          const theme = card.getAttribute('data-theme');
          const color = auraColors[theme] || 'rgba(217, 249, 93, 0.15)';
          
          aura.style.setProperty('--aura-color', color);
          aura.style.transform = `translate(${e.clientX - 450}px, ${e.clientY - 450}px)`;
          document.body.classList.add('aura-active');
        }
      });

      card.addEventListener('mouseleave', () => {
        if (aura) {
          document.body.classList.remove('aura-active');
        }
      });

      // 2. Smooth Page Navigation on Click
      const href = card.getAttribute('href');
      if (href && href !== '#') {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          document.body.classList.add('page-exit');
          setTimeout(() => {
            window.location.href = href;
          }, 280);
        });
      }
    });
  }

  // 3. Header Scroll Effect
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

  // 4. Mobile Navigation Toggle
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

  // 5. Contact Form Handling
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

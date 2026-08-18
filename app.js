/**
 * ravitejabitra.in - Premium Journal UI scripts
 */

document.addEventListener('DOMContentLoaded', () => {

  // 1. Header Scroll Backdrop & Active State
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        header.classList.add('header-scrolled');
      } else {
        header.classList.remove('header-scrolled');
      }
    });
  }

  // 2. IntersectionObserver for Smooth Viewport Entrance Animations
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.15
  };

  const fadeElements = document.querySelectorAll('.fade-in-section');
  
  if ('IntersectionObserver' in window && fadeElements.length > 0) {
    const sectionObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    fadeElements.forEach(el => sectionObserver.observe(el));
  } else {
    // Fallback if IntersectionObserver is unsupported
    fadeElements.forEach(el => el.classList.add('is-visible'));
  }

  // 3. Navigation Active Link Highlight on Scroll
  const sections = document.querySelectorAll('section[id]');
  const navLinksList = document.querySelectorAll('.nav-links a[href^="#"]');

  function highlightNavOnScroll() {
    const scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinksList.forEach(link => {
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', highlightNavOnScroll);

  // 4. Mobile Nav Drawer Toggle
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

  // 5. Contact Form Submission Handler
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      if (btn) {
        const originalText = btn.innerText;
        btn.innerText = 'Message Sent ✓';
        btn.style.background = '#10b981';
        btn.disabled = true;

        setTimeout(() => {
          contactForm.reset();
          btn.innerText = originalText;
          btn.style.background = '';
          btn.disabled = false;
        }, 3000);
      }
    });
  }

});

/**
 * ravitejabitra.in - Minimalist Script
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 1. Header Scroll Effect
  // =========================================================================
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('header-scrolled');
    } else {
      header.classList.remove('header-scrolled');
    }
  });

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

    // Close menu when clicking a link
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
      
      // Simulate form submission
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

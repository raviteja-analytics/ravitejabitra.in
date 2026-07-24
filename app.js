/**
 * ravitejabitra.in - Anime & Marvel/DC Cinematic Universe Engine
 * Features: 60fps HTML5 Live Canvas Energy Particle System + Mouse Attractor
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 1. LIVE ANIMATED CANVAS BACKGROUND ENGINE
  // =========================================================================
  const canvas = document.getElementById('live-bg');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouse = { x: width / 2, y: height / 2, active: false };

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    });

    window.addEventListener('mouseleave', () => {
      mouse.active = false;
    });

    // Particle Array
    const particleCount = Math.min(80, Math.floor(window.innerWidth / 16));
    const particles = [];

    // Superhero Energy Particle Class
    class EnergyParticle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 1.2;
        this.vy = (Math.random() - 0.5) * 1.2;
        this.radius = Math.random() * 2 + 1;
        this.alpha = Math.random() * 0.6 + 0.2;
        
        // Superhero colors (Gold, Cyan, Crimson, Violet)
        const colors = [
          'rgba(255, 200, 0, ',    /* Saiyan Gold */
          'rgba(0, 230, 255, ',    /* Arc Cyan */
          'rgba(255, 40, 100, ',   /* Speed Force Crimson */
          'rgba(170, 0, 255, '     /* Multiverse Violet */
        ];
        this.colorBase = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        if (mouse.active) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const angle = Math.atan2(dy, dx);
            const force = (140 - dist) / 140;
            this.x -= Math.cos(angle) * force * 3;
            this.y -= Math.sin(angle) * force * 3;
          }
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.colorBase + this.alpha + ')';
        ctx.shadowColor = this.colorBase + '0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new EnergyParticle());
    }

    function drawEnergyLines() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const lineAlpha = (1 - dist / 110) * 0.25;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255, 220, 100, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      drawEnergyLines();

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      requestAnimationFrame(animate);
    }

    animate();
  }

  // =========================================================================
  // 2. INTERACTIVE CARD SPOTLIGHT & SUPERHERO AURA ENGINE
  // =========================================================================
  const aura = document.getElementById('ambient-aura');
  const cards = document.querySelectorAll('.activity-card');

  const auraColors = {
    strength:   'rgba(255, 180, 0, 0.35)',   /* Super Saiyan Gold */
    running:    'rgba(255, 40, 80, 0.35)',   /* Speed Force Lightning */
    cycling:    'rgba(0, 230, 255, 0.35)',   /* Arc Reactor Cyan */
    swimming:   'rgba(0, 160, 255, 0.35)',   /* Hydro Ocean Blue */
    badminton:  'rgba(255, 0, 120, 0.35)',   /* Anime Rose Slash */
    travel:     'rgba(170, 0, 255, 0.35)',   /* Multiverse Portal Violet */
    nutrition:  'rgba(0, 230, 120, 0.35)',   /* Sensus Emerald */
    mindset:    'rgba(140, 60, 255, 0.35)',  /* Mind Stone Purple */
    motivation: 'rgba(255, 200, 0, 0.35)'    /* All Might Gold */
  };

  if (cards.length > 0) {
    cards.forEach(card => {

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        if (aura) {
          const theme = card.getAttribute('data-theme');
          const color = auraColors[theme] || 'rgba(255, 200, 0, 0.25)';
          
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

  // Header Scroll
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

  // Mobile Nav Toggle
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
});

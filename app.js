/**
 * ravitejabitra.in - Live Bioluminescent & Robotic Glowworm Canvas Engine
 * Features: 60fps Organic & Cyber Glowworms with sine-wave floating, pulsing halos & mouse attraction
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 1. LIVE ANIMATED CANVAS BACKGROUND ENGINE
  // =========================================================================
  const canvas = document.getElementById('live-bg');
  if (canvas && !canvas.hasAttribute('data-custom-bg')) {
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

    const glowwormCount = Math.min(55, Math.floor(window.innerWidth / 20));
    const glowworms = [];

    // Organic / Cyber Glowworm Class
    class Glowworm {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = Math.random() * 2.5 + 1.8;
        
        // Velocity & organic float angle
        this.angle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.4 + 0.2;
        this.wobbleSpeed = Math.random() * 0.03 + 0.01;
        
        // Glow pulse phase
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = Math.random() * 0.04 + 0.015;
        this.alpha = Math.random() * 0.5 + 0.3;

        // Bioluminescent & Cyber Colors (Emerald, Electric Lime, Cyber Gold, Bio Cyan)
        const colors = [
          { r: 74,  g: 222, b: 128 }, /* Bio Emerald Green */
          { r: 163, g: 230, b: 53  }, /* Electric Lime Glow */
          { r: 251, g: 191, b: 36  }, /* Cyber Amber Gold */
          { r: 56,  g: 189, b: 248 }  /* Hydro Bio Cyan */
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        // Natural organic sine-wave floating motion
        this.angle += (Math.random() - 0.5) * 0.08;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Pulse glowing intensity
        this.pulsePhase += this.pulseSpeed;
        const pulse = (Math.sin(this.pulsePhase) + 1) / 2; // 0 to 1
        this.currentAlpha = 0.25 + pulse * 0.55;

        // Wrap around screen edges smoothly
        if (this.x < -20) this.x = width + 20;
        if (this.x > width + 20) this.x = -20;
        if (this.y < -20) this.y = height + 20;
        if (this.y > height + 20) this.y = -20;

        // Gently drift towards cursor if mouse is nearby (firefly attraction)
        if (mouse.active) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180 && dist > 20) {
            this.x += (dx / dist) * 0.6;
            this.y += (dy / dist) * 0.6;
          }
        }
      }

      draw() {
        const { r, g, b } = this.color;
        
        // Soft glowing outer halo
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.radius * 6
        );
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${this.currentAlpha})`);
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${this.currentAlpha * 0.4})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 6, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Intense core dot
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, this.currentAlpha + 0.2)})`;
        ctx.fill();
      }
    }

    // Populate glowworms
    for (let i = 0; i < glowwormCount; i++) {
      glowworms.push(new Glowworm());
    }

    // Draw subtle bio-electric connection threads when glowworms pass close by
    function drawGlowwormThreads() {
      for (let i = 0; i < glowworms.length; i++) {
        for (let j = i + 1; j < glowworms.length; j++) {
          const dx = glowworms[i].x - glowworms[j].x;
          const dy = glowworms[i].y - glowworms[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 90) {
            const threadAlpha = (1 - dist / 90) * 0.15;
            ctx.beginPath();
            ctx.moveTo(glowworms[i].x, glowworms[i].y);
            ctx.lineTo(glowworms[j].x, glowworms[j].y);
            ctx.strokeStyle = `rgba(74, 222, 128, ${threadAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
    }

    // Main 60fps Animation Loop
    function animate() {
      ctx.clearRect(0, 0, width, height);

      drawGlowwormThreads();

      glowworms.forEach((gw) => {
        gw.update();
        gw.draw();
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

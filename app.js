document.addEventListener('DOMContentLoaded', () => {
  
  // =========================================================================
  // 1. Sticky Header Scroll Effect
  // =========================================================================
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  // =========================================================================
  // 2. Mobile Responsive Menu
  // =========================================================================
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');
  
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      menuToggle.classList.toggle('active');
    });

    // Close menu when clicking links
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        menuToggle.classList.remove('active');
      });
    });
  }

  // =========================================================================
  // 3. Hero Section Typing Effect
  // =========================================================================
  const typingElement = document.getElementById('typing-element');
  if (typingElement) {
    const roles = ['Runner.', 'Cyclist.', 'Traveler.', 'Motivator.'];
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 120;

    function type() {
      const currentRole = roles[roleIndex];
      
      if (isDeleting) {
        typingElement.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;
        typingSpeed = 60; // Delete faster
      } else {
        typingElement.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;
        typingSpeed = 120; // Write slower
      }

      if (!isDeleting && charIndex === currentRole.length) {
        isDeleting = true;
        typingSpeed = 1500; // Pause at full word
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        typingSpeed = 500; // Pause before typing next word
      }

      setTimeout(type, typingSpeed);
    }
    
    // Start typing loop
    setTimeout(type, 1000);
  }

  // =========================================================================
  // 4. Blog Filtering & Search
  // =========================================================================
  const blogSearch = document.getElementById('blog-search');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const blogCards = document.querySelectorAll('.blog-card');
  const noResults = document.getElementById('no-results');

  let activeCategory = 'all';
  let searchQuery = '';

  // Get filter from URL parameter (e.g. ?filter=fitness)
  const urlParams = new URLSearchParams(window.location.search);
  const urlFilter = urlParams.get('filter');
  if (urlFilter) {
    activeCategory = urlFilter;
    
    // Update active class on buttons
    filterBtns.forEach(btn => {
      if (btn.getAttribute('data-filter') === urlFilter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Smoothly scroll to content if we loaded with a filter
    const gridEl = document.getElementById('blog-grid');
    if (gridEl) {
      gridEl.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Apply both filters (Category + Search Query)
  function applyBlogFilters() {
    let visibleCount = 0;

    blogCards.forEach(card => {
      const category = card.getAttribute('data-category');
      const title = card.querySelector('.blog-title').textContent.toLowerCase();
      const excerpt = card.querySelector('.blog-excerpt').textContent.toLowerCase();
      
      const categoryMatch = activeCategory === 'all' || category === activeCategory;
      const searchMatch = searchQuery === '' || title.includes(searchQuery) || excerpt.includes(searchQuery);

      if (categoryMatch && searchMatch) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // Display 'No Results' notice if all cards are hidden
    if (noResults) {
      if (visibleCount === 0) {
        noResults.style.display = 'block';
      } else {
        noResults.style.display = 'none';
      }
    }
  }

  // Set up Search Input Handler
  if (blogSearch) {
    blogSearch.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      applyBlogFilters();
    });
  }

  // Set up Category Buttons click handlers
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update UI active states
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update filter value and trigger filtering
      activeCategory = btn.getAttribute('data-filter');
      applyBlogFilters();
    });
  });

  // Initial call in case a URL filter was set
  if (blogCards.length > 0) {
    applyBlogFilters();
  }

  // =========================================================================
  // 5. Contact / Newsletter Mock Submission (Ready for Supabase)
  // =========================================================================
  const newsletterForm = document.getElementById('newsletter-form');
  const newsletterEmail = document.getElementById('newsletter-email');
  const newsletterMessage = document.getElementById('newsletter-message');

  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const email = newsletterEmail.value.trim();
      if (!email) return;

      // Disable inputs during loading state
      const submitBtn = newsletterForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Subscribing...';

      // Mocking network delay (1 second)
      // Tip: This is where you can plug in your Supabase JS Client:
      // const { data, error } = await supabase.from('subscribers').insert([{ email }]);
      setTimeout(() => {
        // Show success state
        newsletterForm.style.display = 'none';
        
        newsletterMessage.style.color = '#10b981'; // Emerald color
        newsletterMessage.textContent = '🎉 Thank you! You have successfully subscribed to my updates.';
        newsletterMessage.style.display = 'block';
        
        // Save to local storage for demo purposes
        const subscribers = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');
        subscribers.push({ email: email, timestamp: new Date().toISOString() });
        localStorage.setItem('newsletter_subscribers', JSON.stringify(subscribers));
      }, 1000);
    });
  }

});

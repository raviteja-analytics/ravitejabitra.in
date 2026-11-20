// Access Gate Manager for Private Engines (Hydro 4L, Fuel & Macro, Engine)
(function() {
  const STORAGE_KEY = 'bold_engine_unlocked';

  function isUnlocked() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch(e) {
      return false;
    }
  }

  function setUnlocked() {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch(e) {}
  }

  window.relockEngineAccess = function() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch(e) {}
    window.location.reload();
  };

  function createLockOverlay() {
    if (document.getElementById('accessLockOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'accessLockOverlay';
    overlay.className = 'access-lock-overlay';
    overlay.innerHTML = `
      <div class="access-lock-card">
        <div class="access-lock-icon-wrap">🔒</div>
        <div class="access-lock-badge">RESTRICTED VAULT</div>
        <h2 class="access-lock-title">
          <span class="text-metallic-grey">THE</span> <span class="text-metallic-red">BOLD</span> <span class="text-metallic-grey">VAULT</span>
        </h2>
        <div class="laser-rule-row">
          <div class="laser-line-left"></div>
          <span class="laser-tag">FORGED FOR THE FEARLESS</span>
          <div class="laser-line-right"></div>
        </div>
        <p class="access-lock-subtitle">
          Closed Testing Phase • Enter your access PIN or Password to unlock.
        </p>
        
        <form id="accessLockForm" onsubmit="window._submitAccessKey(event)">
          <div class="access-input-wrap">
            <input 
              type="password" 
              id="accessKeyInput" 
              class="access-input-field" 
              placeholder="ENTER PIN OR PASSWORD" 
              autocomplete="current-password" 
              required
            />
            <button type="button" class="btn-toggle-pwd" id="btnTogglePwd" onclick="window._togglePwdVisibility()" title="Show/Hide">
              👁️
            </button>
          </div>
          
          <button type="submit" id="btnUnlockAccess" class="btn-unlock-access">
            <span>⚡ UNLOCK VAULT</span>
          </button>
          
          <div id="accessLockError" class="access-lock-error"></div>
        </form>
        
        <div class="access-lock-footer">
          Authorized testing for <b>@raviteja_fuel_bot</b> • Change anytime in Vercel
        </div>
      </div>
    `;

    document.body.prepend(overlay);

    // Auto-focus input after overlay mounts
    setTimeout(() => {
      const input = document.getElementById('accessKeyInput');
      if (input) input.focus();
    }, 100);
  }

  window._togglePwdVisibility = function() {
    const input = document.getElementById('accessKeyInput');
    const btn = document.getElementById('btnTogglePwd');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (btn) btn.innerText = '🙈';
    } else {
      input.type = 'password';
      if (btn) btn.innerText = '👁️';
    }
  };

  window._submitAccessKey = async function(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('accessKeyInput');
    const submitBtn = document.getElementById('btnUnlockAccess');
    const errorEl = document.getElementById('accessLockError');

    const key = (input?.value || '').trim();
    if (!key) return;

    if (errorEl) {
      errorEl.classList.remove('show');
      errorEl.innerText = '';
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>⏳ Verifying...</span>`;
    }

    try {
      const res = await fetch('/api/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setUnlocked();
        const overlay = document.getElementById('accessLockOverlay');
        if (overlay) {
          overlay.classList.add('hidden');
          setTimeout(() => overlay.remove(), 400);
        }
      } else {
        throw new Error(data.error || 'Incorrect password or PIN');
      }
    } catch(err) {
      if (errorEl) {
        errorEl.innerText = err.message || 'Incorrect password or PIN. Access denied.';
        errorEl.classList.add('show');
      }
      if (input) {
        input.value = '';
        input.focus();
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>⚡ Unlock Engine</span>`;
      }
    }
  };

  // Check state on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkLockState);
  } else {
    checkLockState();
  }

  function checkLockState() {
    if (!isUnlocked()) {
      createLockOverlay();
    }
  }
})();

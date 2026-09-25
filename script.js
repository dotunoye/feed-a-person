"use strict";

document.documentElement.classList.add("js");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ---------------------------------------------
   1. MOBILE NAVIGATION & DRAWER
--------------------------------------------- */
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#site-nav");

function closeMenu(restoreFocus = false) {
  menuButton?.setAttribute("aria-expanded", "false");
  menuButton?.setAttribute("aria-label", "Open menu");
  navigation?.classList.remove("is-open");
  document.body.classList.remove("menu-open");
  if (restoreFocus) menuButton?.focus();
}

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  navigation?.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
});

navigation?.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (menuButton?.getAttribute("aria-expanded") !== "true") return;
  if (event.key === "Escape") closeMenu(true);
  if (event.key === "Tab" && navigation) {
    const last = navigation.querySelector("a:last-child");
    if (event.shiftKey && document.activeElement === menuButton) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      menuButton?.focus();
    }
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".site-header")) closeMenu();
});

window.matchMedia("(min-width: 901px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});

// Dynamic year injection
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

/* ---------------------------------------------
   2. STATS DATA COUNTERS
--------------------------------------------- */
const formatter = new Intl.NumberFormat("en-NG");
const counters = document.querySelectorAll("[data-target], [data-count]");

function animateCounter(element) {
  const target = Number(element.dataset.target ?? element.dataset.count);
  const suffix = element.dataset.suffix || "";
  const finalValue = formatter.format(target) + suffix;
  element.setAttribute("aria-label", finalValue);

  if (motionPreference.matches) {
    element.textContent = finalValue;
    return;
  }

  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / 1400, 1);
    element.textContent = formatter.format(Math.round(target * (1 - (1 - progress) ** 3))) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

if ("IntersectionObserver" in window) {
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
        } else {
          // Reset number to 0 so it animates upwards again next time
          entry.target.textContent = "0";
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((counter) => counterObserver.observe(counter));
}

/* ---------------------------------------------
   3. HERO BACKGROUND VIDEO CONTROL
--------------------------------------------- */
const video = document.querySelector(".hero-video");
const videoControl = document.querySelector(".video-control");

if (video && videoControl) {
  let userPaused = false;
  let inView = true;
  const allowed = () => !motionPreference.matches && !navigator.connection?.saveData;

  function syncLabel() {
    videoControl.textContent = video.paused ? "Play video" : "Pause video";
  }

  async function syncVideo() {
    if (!allowed()) {
      video.pause();
      video.classList.remove("is-playing");
      videoControl.hidden = true;
      return;
    }
    if (userPaused || document.hidden || !inView) {
      video.pause();
      return;
    }
    if (!video.src && video.dataset.src) video.src = video.dataset.src;
    try {
      await video.play();
    } catch {
      videoControl.hidden = false;
      syncLabel();
    }
  }

  video.addEventListener("playing", () => {
    if (!allowed()) { syncVideo(); return; }
    video.classList.add("is-playing");
    videoControl.hidden = false;
    syncLabel();
  });

  video.addEventListener("pause", syncLabel);
  video.addEventListener("error", () => {
    video.classList.remove("is-playing");
    videoControl.hidden = true;
  });

  videoControl.addEventListener("click", () => {
    userPaused = !video.paused;
    syncVideo();
  });

  motionPreference.addEventListener("change", syncVideo);
  document.addEventListener("visibilitychange", syncVideo);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      syncVideo();
    }).observe(video);
  }

  if (document.readyState === "complete") syncVideo();
  else window.addEventListener("load", syncVideo, { once: true });
}

/* ---------------------------------------------
   4. DOM INTERACTION & APPLICATION ENGINE
--------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  // A. Clipboard Copy (Bank Account Number)
  const copyBtn = document.getElementById("copyAccountBtn");
  const accountNumberEl = document.getElementById("accountNumber");

  if (copyBtn && accountNumberEl) {
    copyBtn.addEventListener("click", async () => {
      const text = accountNumberEl.innerText.trim();
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.classList.add("copied");
        setTimeout(() => copyBtn.classList.remove("copied"), 2000);
      } catch {
        const temp = document.createElement("textarea");
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
        copyBtn.classList.add("copied");
        setTimeout(() => copyBtn.classList.remove("copied"), 2000);
      }
    });
  }

  // B. Unified Switcher Tabs with Sliding Indicator Pill
  const tabsContainer = document.querySelector(".switcher-tabs");
  const switcherTabs = [...document.querySelectorAll(".switcher-tab")];
  const switcherPanels = [...document.querySelectorAll(".switcher-panel")];
  const indicator = document.querySelector(".switcher-indicator");

  function updateIndicator(targetTab) {
    if (!targetTab || !indicator) return;
    indicator.style.width = `${targetTab.offsetWidth}px`;
    indicator.style.transform = `translateX(${targetTab.offsetLeft}px)`;
  }

  function activateInvolvementTab(tab, shouldFocus = false) {
    const target = tab.dataset.switch || tab.getAttribute("aria-controls");

    switcherTabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });

    switcherPanels.forEach((panel) => {
      panel.hidden = panel.id !== target;
    });

    updateIndicator(tab);
    history.replaceState(null, "", `#${target}`);
    if (shouldFocus) tab.focus();
  }

  switcherTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateInvolvementTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? switcherTabs.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + switcherTabs.length) % switcherTabs.length;
      activateInvolvementTab(switcherTabs[next], true);
    });
  });

  if (switcherTabs.length) {
    const targetHash = location.hash;
    const initialTab =
      switcherTabs.find((t) => `#${t.dataset.switch}` === targetHash || `#${t.getAttribute("aria-controls")}` === targetHash) ||
      switcherTabs.find((t) => t.getAttribute("aria-selected") === "true") ||
      switcherTabs[0];

    setTimeout(() => activateInvolvementTab(initialTab), 50);
  }

  window.addEventListener("resize", () => {
    const currentTab = document.querySelector('.switcher-tab[aria-selected="true"]');
    if (currentTab) updateIndicator(currentTab);
  });

  // C. Donor Recognition Toggle (Public vs. Anonymous)
  const control = document.querySelector(".segmented-control");
  const btnPublic = document.getElementById("btn-public");
  const btnAnonymous = document.getElementById("btn-anonymous");
  const formCollapse = document.getElementById("donorDetailsCollapse");
  const donorStatusHidden = document.getElementById("donorStatusHidden");
  const donorName = document.getElementById("donor-name");
  const donorPhone = document.getElementById("donor-phone");

  if (control && btnPublic && btnAnonymous && formCollapse) {
    btnPublic.addEventListener("click", () => {
      control.classList.remove("is-anonymous");
      btnPublic.classList.add("active");
      btnPublic.setAttribute("aria-pressed", "true");
      btnAnonymous.classList.remove("active");
      btnAnonymous.setAttribute("aria-pressed", "false");

      formCollapse.hidden = false;
      formCollapse.classList.remove("is-hidden");
      formCollapse.setAttribute("aria-hidden", "false");

      if (donorStatusHidden) donorStatusHidden.value = "Identified Donor";
      if (donorName) donorName.required = true;
      if (donorPhone) donorPhone.required = true;
    });

    btnAnonymous.addEventListener("click", () => {
      control.classList.add("is-anonymous");
      btnAnonymous.classList.add("active");
      btnAnonymous.setAttribute("aria-pressed", "true");
      btnPublic.classList.remove("active");
      btnPublic.setAttribute("aria-pressed", "false");

      formCollapse.classList.add("is-hidden");
      formCollapse.setAttribute("aria-hidden", "true");
      setTimeout(() => {
        if (control.classList.contains("is-anonymous")) formCollapse.hidden = true;
      }, 300);

      if (donorStatusHidden) donorStatusHidden.value = "Anonymous Pledge";
      if (donorName) donorName.required = false;
      if (donorPhone) donorPhone.required = false;
    });
  }

  // D. Multi-Step Volunteer Form Progression
  const volunteerForm = document.getElementById("volunteerForm");
  if (volunteerForm) {
    const steps = volunteerForm.querySelectorAll(".form-step");
    const indicators = volunteerForm.querySelectorAll(".step-indicator");
    let currentStep = 1;

    function showStep(stepNum) {
      steps.forEach((step) => {
        const isTarget = parseInt(step.getAttribute("data-step"), 10) === stepNum;
        step.hidden = !isTarget;
        step.classList.toggle("active", isTarget);
      });

      indicators.forEach((indicator, idx) => {
        indicator.classList.toggle("active", idx + 1 === stepNum);
      });
      currentStep = stepNum;
    }

    volunteerForm.querySelectorAll(".btn-next").forEach((btn) => {
      btn.addEventListener("click", () => {
        const currentContainer = volunteerForm.querySelector(`.form-step[data-step="${currentStep}"]`);
        const inputs = currentContainer.querySelectorAll("input, select, textarea");

        let valid = true;
        inputs.forEach((input) => {
          if (!input.checkValidity()) {
            input.reportValidity();
            valid = false;
          }
        });

        if (valid && currentStep < steps.length) {
          showStep(currentStep + 1);
        }
      });
    });

    volunteerForm.querySelectorAll(".btn-prev").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (currentStep > 1) {
          showStep(currentStep - 1);
        }
      });
    });
  }

  // E. Centralized Web3Forms AJAX Engine
  const allWeb3Forms = document.querySelectorAll("form[data-web3form]");

  allWeb3Forms.forEach((form) => {
    // Unlock any button by default
    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = false;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!form.reportValidity()) return;

      const statusEl = form.querySelector('.form-status, [role="status"]');
      const initialText = submitBtn ? submitBtn.innerText : "Submit";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Submitting...";
      }

      if (statusEl) {
        statusEl.textContent = "Sending...";
        statusEl.className = "form-status is-notice";
      }

      const formData = new FormData(form);
      const jsonObject = Object.fromEntries(formData);
      const payload = JSON.stringify(jsonObject);

      try {
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: payload,
        });

        const data = await response.json();

        if (response.status === 200 && data.success) {
          // Check specifically if this is the volunteer form
          if (form.id === 'volunteerForm' || form.dataset.form === 'volunteer') {
            // Hide the form fields and steppers completely
            const steps = form.querySelectorAll('.form-step');
            const stepper = form.querySelector('.form-stepper');
            if (stepper) stepper.hidden = true;
            steps.forEach((s) => (s.hidden = true));

            // Render custom success container with WhatsApp join link
            if (statusEl) {
              statusEl.innerHTML = `
        <div class="volunteer-success-box">
          <h4>Application Received!</h4>
          <p>Thank you for stepping up to bridge the route.</p>
          <p class="community-pitch">Join the official volunteer task force on WhatsApp to get briefing dates and dispatch calls:</p>
          <a href="https://chat.whatsapp.com/JoEyhZnDbAK6cdZzWPUvPi?mode=gi_t" target="_blank" rel="noopener noreferrer" class="link-whatsapp-inline">
            Join Volunteer Community &rarr;
          </a>
        </div>
      `;
              statusEl.className = 'form-status success-expanded';
            }
          } else {
            // Standard response for donate, partner, and contact forms
            if (statusEl) {
              statusEl.textContent = 'Submission received! We appreciate your support.';
              statusEl.className = 'form-status success';
            }
            form.reset();
          }
        

        // Reset volunteer form back to step 1
        if (form.classList.contains("multi-step-form")) {
          const steps = form.querySelectorAll(".form-step");
          const indicators = form.querySelectorAll(".step-indicator");
          steps.forEach((s, idx) => { s.hidden = idx !== 0; });
          indicators.forEach((ind, idx) => { ind.classList.toggle("active", idx === 0); });
        }
      } else {
        if (statusEl) {
          statusEl.textContent = data.message || "Submission failed. Please try again.";
          statusEl.className = "form-status error";
        }
      }
    } catch {
      if (statusEl) {
        statusEl.textContent = "Network error. Please check your connection and retry.";
        statusEl.className = "form-status error";
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = initialText;
      }
    }
  });
});
});

// --- DUAL COUNTDOWN ENGINE (Main Clock + Modal Clock) ---
const targetDateStr = "2026-10-29T14:00:00+01:00"; // Adjust to your actual target date
const targetTime = new Date(targetDateStr).getTime();

function updateClocks() {
  const now = new Date().getTime();
  const diff = targetTime - now;

if (diff <= 0) {
    clearInterval(clockInterval);
    
    // 1. Swap the Main Homepage Clock (if it exists)
    const clockContainer = document.getElementById('eventClock');
    if (clockContainer) {
      clockContainer.innerHTML = '<div class="live-indicator"><span class="pulse-dot"></span> D-DAY: LIVE OPERATIONS</div><p>Head to the Live Telemetry Dashboard.</p>';
    }

    // 2. Swap the Modal States
    const stateCountdown = document.getElementById('state-countdown');
    const stateLive = document.getElementById('state-live');
    
    if (stateCountdown && stateLive) {
      stateCountdown.classList.remove('is-active');
      stateLive.classList.add('is-active');
    }
    
    return; // Kill the math engine so it stops counting negative numbers
  }

  // Calculate time units
  const dStr = String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(2, '0');
  const hStr = String(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
  const mStr = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
  const sStr = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');

  // Update massive homepage clock (if it exists on page)
  const elDays = document.getElementById('days');
  if (elDays) {
    elDays.textContent = dStr;
    document.getElementById('hours').textContent = hStr;
    document.getElementById('minutes').textContent = mStr;
    document.getElementById('seconds').textContent = sStr;
  }

  // Update modal clock (if it exists on page)
  const modDays = document.getElementById('modal-days');
  if (modDays) {
    modDays.textContent = dStr;
    document.getElementById('modal-hours').textContent = hStr;
    document.getElementById('modal-minutes').textContent = mStr;
    document.getElementById('modal-seconds').textContent = sStr;
  }
}

// Initialize immediately to prevent layout flash, then interval
updateClocks();
const clockInterval = setInterval(updateClocks, 1000);

// // --- MODAL TAKEOVER LOGIC ---
// const toast = document.getElementById('dispatchToast');
// const closeToastBtn = document.getElementById('closeToast');

// if (toast && closeToastBtn) {
//   const isDismissed = sessionStorage.getItem('fap_toast_dismissed');

//   // Helper function to keep our code clean when killing the modal
//   const dismissModal = () => {
//     toast.classList.remove('is-visible');
//     toast.setAttribute('aria-hidden', 'true');
//     sessionStorage.setItem('fap_toast_dismissed', 'true');
//   };

//   if (!isDismissed) {
//     // TIMING CONTROL: 1500 = 1.5 seconds. Change this number to speed it up or slow it down.
//     setTimeout(() => {
//       toast.classList.add('is-visible');
//       toast.setAttribute('aria-hidden', 'false');
//     }, 1000); 
//   }

//   // 1. Close when they click the 'X' button
//   closeToastBtn.addEventListener('click', dismissModal);

//   // 2. Close when they click anywhere outside the modal box
//   document.addEventListener('click', (event) => {
//     const isModalVisible = toast.classList.contains('is-visible');
//     const isClickOutside = !toast.contains(event.target);
    
//     if (isModalVisible && isClickOutside) {
//       dismissModal();
//     }
//   });
// }

// --- MODAL TAKEOVER LOGIC (AUTO-DISMISS) ---
const toast = document.getElementById('dispatchToast');
const closeToastBtn = document.getElementById('closeToast');

if (toast && closeToastBtn) {
  let autoKillTimer; // Holds the 5-second self-destruct sequence

  const dismissModal = () => {
    toast.classList.remove('is-visible');
    toast.setAttribute('aria-hidden', 'true');
    clearTimeout(autoKillTimer); // Kills the timer if they close it manually first
  };

  // 1. Fires unconditionally after 1.5 seconds
  setTimeout(() => {
    toast.classList.add('is-visible');
    toast.setAttribute('aria-hidden', 'false');
    
    // 2. Starts the 5-second countdown to automatically hide it
    autoKillTimer = setTimeout(dismissModal, 5000);
  }, 1500); 

  // 3. Close when they click the 'X' button
  closeToastBtn.addEventListener('click', dismissModal);

  // 4. Close when they click anywhere outside the modal box
  document.addEventListener('click', (event) => {
    const isModalVisible = toast.classList.contains('is-visible');
    const isClickOutside = !toast.contains(event.target);
    
    if (isModalVisible && isClickOutside) {
      dismissModal();
    }
  });
}

// --- LIVE TELEMETRY ENGINE WITH OVERFLOW ---

// In production, this function will ping your CMS (Sanity, Supabase, or Google Sheets)
// --- NATIVE GOOGLE SHEETS TELEMETRY ENGINE (NO PROXY) ---

async function fetchLiveData() {
  // Direct connection to Google's CSV export
  const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9fmK3uzhFNA2Np47YHPOV_GJiFS1IuMOjnNiTtD9VQ2GgU4G_NSUuNHKVhKIvYm1LbdtLcj1kKSgo/pub?output=csv'; 
  
  // Cache-buster to guarantee live data
  const targetUrl = `${sheetUrl}&t=${new Date().getTime()}`;
  
  try {
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    
    // Parse the CSV into a Key-Value object
    const rows = csvText.split('\n');
    const data = {};
    
    rows.forEach(row => {
      const [key, ...valueParts] = row.split(',');
      if (key && valueParts.length > 0) {
        data[key.trim()] = valueParts.join(',').replace('\r', '').trim(); 
      }
    });

    // 1. Update the Sync Timestamp
    if (document.getElementById('sync-time')) {
      document.getElementById('sync-time').textContent = data['last_updated'] || '--:--';
    }

    // 2. Parse Numbers for the Rings (fallback to 0 or 2000 if blank)
    const foodCurrent = parseInt(data['food_current']) || 0;
    const foodTarget = parseInt(data['food_target']) || 2000;
    const peopleCurrent = parseInt(data['people_current']) || 0;
    const peopleTarget = parseInt(data['people_target']) || 2000;

    // 3. Fire the Ring Animations
    updateRing('food-ring', 'food-overflow', 'food-percent', 'food-current', foodCurrent, foodTarget, true);
    updateRing('people-ring', 'people-overflow', 'people-percent', 'people-current', peopleCurrent, peopleTarget, false);

  } catch (error) {
    console.error("Critical failure pulling telemetry from Google Sheets:", error);
  }
}

// Fire immediately on load
document.addEventListener('DOMContentLoaded', fetchLiveData);

// Auto-Refresh every 60 seconds
setInterval(fetchLiveData, 60000);

// The Math Engine
function updateRing(primaryId, overflowId, percentId, currentId, currentVal, targetVal, isKg) {
  const primaryRing = document.getElementById(primaryId);
  const overflowRing = document.getElementById(overflowId);
  const percentText = document.getElementById(percentId);
  const currentText = document.getElementById(currentId);

  if (!primaryRing || !overflowRing) return;

  // Calculate percentages
  const rawPercent = (currentVal / targetVal) * 100;
  const basePercent = Math.min(rawPercent, 100);
  const overPercent = Math.max(0, rawPercent - 100);

  // SVG Geometry
  const radius = primaryRing.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;

  primaryRing.style.strokeDasharray = `${circumference} ${circumference}`;
  overflowRing.style.strokeDasharray = `${circumference} ${circumference}`;

  // Start both at empty
  primaryRing.style.strokeDashoffset = circumference;
  overflowRing.style.strokeDashoffset = circumference;

  // Update text
  percentText.textContent = `${Math.round(rawPercent)}%`;
  currentText.innerHTML = isKg ? `${currentVal.toLocaleString()} <small>packs</small>` : currentVal.toLocaleString();

  // Execute animations
  setTimeout(() => {
    // Draw base ring (stops at 100%)
    primaryRing.style.strokeDashoffset = circumference - (basePercent / 100) * circumference;
    
    // Draw overflow ring on top (only visible if > 100%)
    if (overPercent > 0) {
      // Caps the overflow visual at another 100% so it doesn't wrap infinitely
      const displayOverflow = Math.min(overPercent, 100); 
      overflowRing.style.strokeDashoffset = circumference - (displayOverflow / 100) * circumference;
    }
  }, 100);
}

// Run on load. You can also set a setInterval here to poll the CMS every 60 seconds on D-Day.
document.addEventListener('DOMContentLoaded', fetchLiveData);
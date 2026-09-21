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
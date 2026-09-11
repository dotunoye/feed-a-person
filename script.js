"use strict";
// Add only verified production endpoints. Empty values keep this preview honest.
const FAP_CONFIG = Object.freeze({
  paymentUrl: "", // HTTPS payment gateway URL; donation amount is added as ?amount= (NGN).
  volunteerEndpoint: "", // Same-origin or CORS-enabled HTTPS JSON POST endpoint.
  contactEndpoint: "",
});
document.documentElement.classList.add("js");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
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
  navigation.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
});
navigation?.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (menuButton?.getAttribute("aria-expanded") !== "true") return;
  if (event.key === "Escape") closeMenu(true);
  if (event.key === "Tab") {
    const last = navigation.querySelector("a:last-child");
    if (event.shiftKey && document.activeElement === menuButton) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      menuButton.focus();
    }
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".site-header")) closeMenu();
});
window.matchMedia("(min-width: 901px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Counters remain readable without JS and animate once when visible.
const formatter = new Intl.NumberFormat("en-NG");
const counters = document.querySelectorAll("[data-count]");
function animateCounter(element) {
  const target = Number(element.dataset.count);
  element.setAttribute("aria-label", formatter.format(target) + " plus");
  if (motionPreference.matches) return;
  const started = performance.now();
  function tick(now) {
    const progress = motionPreference.matches
      ? 1
      : Math.min((now - started) / 1400, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatter.format(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 },
  );
  counters.forEach((counter) => observer.observe(counter));
}

const donateButton = document.querySelector("#donate-button");
const customAmount = document.querySelector("#custom-amount");
const amountButtons = document.querySelectorAll("[data-amount]");
let donationAmount = 5000;
function updateDonationButton() {
  if (donateButton)
    donateButton.textContent =
      donationAmount > 0
        ? `Donate ₦${formatter.format(donationAmount)} ↗`
        : "Donate ↗";
}
amountButtons.forEach((button) =>
  button.addEventListener("click", () => {
    donationAmount = Number(button.dataset.amount);
    customAmount.value = "";
    customAmount.setCustomValidity("");
    amountButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    updateDonationButton();
  }),
);
customAmount?.addEventListener("input", () => {
  donationAmount = Number(customAmount.value);
  customAmount.setCustomValidity("");
  amountButtons.forEach((item) => {
    item.classList.remove("selected");
    item.setAttribute("aria-pressed", "false");
  });
  updateDonationButton();
});
donateButton?.addEventListener("click", () => {
  const status = document.querySelector("#donation-status");
  if (!Number.isSafeInteger(donationAmount) || donationAmount < 100) {
    customAmount.setCustomValidity(
      "Please choose or enter a whole amount of at least ₦100.",
    );
    customAmount.reportValidity();
    return;
  }
  if (!FAP_CONFIG.paymentUrl) {
    status.textContent =
      "Thank you for wanting to give. Our payment gateway is not connected yet. No payment has been taken. Please return when verified giving details are available.";
    status.classList.add("is-notice");
    return;
  }
  try {
    const url = new URL(FAP_CONFIG.paymentUrl);
    if (url.protocol !== "https:") throw new Error("Invalid payment URL");
    url.searchParams.set("amount", String(donationAmount));
    window.location.assign(url.href);
  } catch {
    status.textContent =
      "Online giving is temporarily unavailable. No payment has been taken.";
    status.classList.add("is-notice");
  }
});

// The server must validate, rate-limit, and persist submissions before returning success.
document.querySelectorAll("form[data-form]").forEach((form) => {
  form.querySelector('[type="submit"]').disabled = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const status = form.querySelector('[role="status"]');
    const submit = form.querySelector('[type="submit"]');
    const endpoint = FAP_CONFIG[`${form.dataset.form}Endpoint`];
    status.classList.add("is-notice");
    if (!endpoint) {
      status.textContent =
        "Online submission is not connected yet. Nothing has been sent or saved. Please email feedaperson.initiative@gmail.com or call 07047341823 to reach our team.";
      return;
    }
    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    status.textContent = "Sending…";
    try {
      const url = new URL(endpoint, window.location.href);
      if (url.protocol !== "https:" && url.origin !== window.location.origin)
        throw new Error("Insecure endpoint");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Submission failed");
      status.textContent = "Thank you. Your submission has been received.";
      form.reset();
    } catch {
      status.textContent =
        "We couldn’t send your details. They remain in the form so you can try again.";
    } finally {
      submit.disabled = false;
      submit.removeAttribute("aria-busy");
    }
  });
});

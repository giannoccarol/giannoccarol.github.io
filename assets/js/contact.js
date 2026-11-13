// Contact form. It stays hidden until the page carries the Worker URL and the Turnstile site key
// (data-endpoint and data-sitekey on the form); then it loads Turnstile and sends the message to the Worker,
// which checks everything again on the server.
(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const endpoint = form.dataset.endpoint || "";
  const sitekey = form.dataset.sitekey || "";
  if (!/^https:\/\//.test(endpoint) || !sitekey || sitekey.startsWith("__")) return;

  const msgs = {};
  document.querySelectorAll("#contact-messages [data-key]").forEach((el) => {
    msgs[el.dataset.key] = el.textContent.trim();
  });
  const status = form.querySelector(".form-status");
  const button = form.querySelector('button[type="submit"]');
  const lang = document.documentElement.lang || "en";

  form.hidden = false;
  form.elements.ts.value = String(Date.now());

  let widget = null;
  window.onTurnstileLoad = function () {
    widget = window.turnstile.render("#cf-turnstile", {
      sitekey: sitekey,
      theme: "dark",
      language: lang,
      action: "contact",
    });
  };
  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
  script.async = true;
  document.head.appendChild(script);

  function say(key, isError) {
    status.textContent = msgs[key] || msgs.error;
    status.classList.toggle("is-error", Boolean(isError));
  }

  function resetChallenge() {
    if (window.turnstile && widget !== null) window.turnstile.reset(widget);
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const email = form.elements.email;
    const message = form.elements.message;
    if (!email.value.trim() || !email.checkValidity() || message.value.trim().length < 10) {
      say("invalid", true);
      return;
    }
    const data = new FormData(form);
    if (!data.get("cf-turnstile-response")) {
      say("bot", true);
      return;
    }
    button.disabled = true;
    say("sending", false);
    try {
      const res = await fetch(endpoint, { method: "POST", body: data });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        form.reset();
        form.elements.ts.value = String(Date.now());
        say("sent", false);
      } else {
        say(["bot", "rate", "invalid"].includes(body.error) ? body.error : "error", true);
      }
    } catch (err) {
      say("error", true);
    } finally {
      resetChallenge();
      button.disabled = false;
    }
  });
})();

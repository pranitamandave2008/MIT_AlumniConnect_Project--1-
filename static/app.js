document.addEventListener("DOMContentLoaded", () => {
  const forms = document.querySelectorAll("form");
  forms.forEach(form => {
    form.addEventListener("submit", () => {
      const submit = form.querySelector('button[type="submit"], button:not([type])');
      if (submit && !form.hasAttribute("data-no-loading")) {
        submit.dataset.originalText = submit.textContent;
        submit.textContent = "Please wait…";
      }
    });
  });
});

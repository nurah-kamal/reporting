// Real accounts aren't set up yet, so the forms show a notice instead of sending anything.

document.querySelectorAll('[data-toggle-password]').forEach((button) => {
  const input = document.getElementById(button.getAttribute('aria-controls'));

  button.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.textContent = show ? 'Hide' : 'Show';
    button.setAttribute('aria-pressed', String(show));
  });
});

document.querySelectorAll('form[data-not-connected]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const notice = form.querySelector('.form-notice');
    notice.hidden = false;
    notice.focus();
  });
});

document.querySelectorAll('[data-demo-sign-in]').forEach((button) => {
  button.addEventListener('click', () => {
    if (startDemoSession(button.dataset.demoSignIn)) {
      location.href = HOME_PAGE;
      return;
    }
    const notice = document.getElementById('demo-blocked');
    notice.hidden = false;
    notice.focus();
  });
});

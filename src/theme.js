const themeToggle = document.getElementById('btnTheme');
const html = document.documentElement;

const storedTheme = localStorage.getItem('portals-ide-theme');

function applyTheme(theme) {
  if (theme === 'dark') {
    html.dataset.theme = 'dark';
  } else if (theme === 'light') {
    html.dataset.theme = 'light';
  } else {
    html.removeAttribute('data-theme');
  }
}

function getPreferredTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function toggleTheme() {
  const current = html.dataset.theme || getPreferredTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('portals-ide-theme', next);
}

themeToggle.addEventListener('click', toggleTheme);

if (storedTheme === 'dark' || storedTheme === 'light') {
  applyTheme(storedTheme);
} else {
  applyTheme(getPreferredTheme());
}

// Small enhancements only. Every page works fully without JavaScript.
document.documentElement.classList.add('js');

// Mobile menu toggle
const toggle = document.querySelector('.nav-toggle');
const links = document.getElementById('nav-links');
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  links.classList.toggle('open', !open);
});
links.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    toggle.setAttribute('aria-expanded', 'false');
    links.classList.remove('open');
  }
});

// Header shadow once the page scrolls
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Gentle fade-in for cards as they scroll into view
if ('IntersectionObserver' in window) {
  const linked = location.hash && document.getElementById(location.hash.slice(1));
  const items = [...document.querySelectorAll('.story, .overview-card')]
    // Never hide the item a visitor was just linked to
    .filter((el) => !(linked && (el === linked || el.contains(linked) || linked.contains(el))));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -40px 0px' });
  items.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
}

// Arriving from a link on another page: once fonts and images have loaded
// (which can shift the layout), make sure the linked item is in view.
window.addEventListener('load', () => {
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target) target.scrollIntoView({ block: 'start' });
});

// Academics page: projects
const projects = document.querySelectorAll('details.project');
if (projects.length) {
  // A link to a specific project (e.g. academics.html#project-2) opens it
  const openFromHash = () => {
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (target && target.matches('details.project')) target.open = true;
  };
  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  // "Expand all / Collapse all" button
  const btn = document.getElementById('toggle-projects');
  if (btn) {
    const sync = () => {
      const allOpen = [...projects].every((p) => p.open);
      btn.textContent = allOpen ? 'Collapse all' : 'Expand all';
    };
    btn.hidden = false;
    btn.addEventListener('click', () => {
      const allOpen = [...projects].every((p) => p.open);
      projects.forEach((p) => { p.open = !allOpen; });
      sync();
    });
    projects.forEach((p) => p.addEventListener('toggle', sync));
    sync();
  }
}

// Keep the footer year current
document.getElementById('year').textContent = new Date().getFullYear();

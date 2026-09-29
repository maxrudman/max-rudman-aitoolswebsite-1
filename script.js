// Small enhancements only. The site works fully without JavaScript.
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
  const items = document.querySelectorAll('.story, .card, .entry');
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

// Keep the footer year current
document.getElementById('year').textContent = new Date().getFullYear();

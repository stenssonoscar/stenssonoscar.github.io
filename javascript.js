// Smooth scrolling for navigation links
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    });
  });
  
  // Add dark mode toggle functionality
  const themeToggle = document.getElementById('theme-toggle');
  
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    themeToggle.textContent = document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
  });
  
  // Optional: Add interactivity for project items
  document.querySelectorAll('.project-item').forEach(item => {
    item.addEventListener('mouseover', () => {
      item.style.transform = 'scale(1.02)';
      item.style.transition = 'transform 0.3s ease';
    });
    item.addEventListener('mouseout', () => {
      item.style.transform = 'scale(1)';
    });
  });
  
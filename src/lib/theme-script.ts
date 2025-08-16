// This script runs on page load to set the correct theme based on localStorage or system preference
export function initializeTheme() {
  // Check if theme is stored in localStorage
  const storedTheme = localStorage.getItem('theme');
  
  if (storedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (storedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // If no theme is stored, use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }
}

// Add a listener for system theme changes
export function setupThemeListener() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only apply system preference if no theme is stored in localStorage
    if (!localStorage.getItem('theme')) {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  });
}

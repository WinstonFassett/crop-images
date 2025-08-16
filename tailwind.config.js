/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        // Custom colors with unique names to avoid conflicts with Shadcn UI
        'app-blue': '#70d6ff',
        'app-blue-dark': '#5aa8cc',
        'app-pink': '#ff70a6',
        'app-pink-dark': '#cc5985',
        'app-lime': '#e9ff70',
        'app-lime-dark': '#bacc59',
        'app-orange': '#ff9770',
        'app-orange-dark': '#cc7959',
        'app-bg-dark': '#121212',
        'app-surface-dark': '#1e1e1e',
        'app-surface-light-dark': '#2d2d2d'
      }
    }
  }
}

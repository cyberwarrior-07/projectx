/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff6600',
          dark: '#cc5200',
          light: '#ff8533',
        },
        accent: '#ff944d',
        background: {
          DEFAULT: '#000000',
          light: '#1a1a1a',
          lighter: '#262626',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#ff6600',
            a: {
              color: '#ff6600',
              '&:hover': {
                color: '#ff8533',
              },
            },
            h1: {
              color: '#ff6600',
            },
            h2: {
              color: '#ff6600',
            },
            h3: {
              color: '#ff6600',
            },
            strong: {
              color: '#ff6600',
            },
            code: {
              color: '#ff6600',
            },
            blockquote: {
              color: '#ff6600',
              borderLeftColor: '#ff6600',
            },
          },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
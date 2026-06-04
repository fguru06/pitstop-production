Place Mechanic webfont files here and update/enable @font-face in `src/styles/tailwind.css`.

Recommended filenames:
- Mechanic.woff2
- Mechanic.woff

Example @font-face (uncomment in `tailwind.css`):

@font-face {
  font-family: 'Mechanic';
  src: url('/fonts/Mechanic.woff2') format('woff2'),
       url('/fonts/Mechanic.woff') format('woff');
  font-weight: 400 900;
  font-style: normal;
  font-display: swap;
}

After placing the files, reload the dev server to pick up the new fonts.
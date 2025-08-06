import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ImageCropperPro from './ImageCropperPrototype';
// import './index.css';
// import App from './App';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={darkTheme}>
      {/* <CssBaseline />
      <App /> */}
      <ImageCropperPro />
    </ThemeProvider>
  </StrictMode>,
);

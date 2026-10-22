import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource-variable/merriweather/opsz.css';
import '@fontsource-variable/merriweather/opsz-italic.css';
import '@/styles/tokens.css';
import '@/styles/base.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

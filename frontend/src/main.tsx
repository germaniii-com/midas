import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import { ToastProvider } from '@heroui/toast';
import { getInitialTheme } from './hooks/useTheme';
import { DARK_THEMES } from './constants/preferences';
import './index.css';
import App from './App';

const initial = getInitialTheme();
document.documentElement.setAttribute('data-theme', initial);
document.documentElement.classList.toggle('dark', DARK_THEMES.includes(initial));

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <HeroUIProvider>
        <ToastProvider placement="top-center" />
        <App />
      </HeroUIProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import { ToastProvider } from '@heroui/toast';
import { getInitialTheme } from './hooks/useTheme';
import './index.css';
import App from './App';

document.documentElement.classList.toggle('dark', getInitialTheme() === 'dark');

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

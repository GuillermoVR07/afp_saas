/*// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx'; // <-- Nuevo

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);*/
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { NotificationProvider } from './context/NotificacionContext.jsx';
import { HelpProvider } from './context/HelpContext.jsx';
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 1. AuthProvider MÁS EXTERNO */}
      <AuthProvider>
        {/* 2. ThemeProvider DENTRO de AuthProvider */}
        <ThemeProvider>
          {/* 3. NotificationProvider DENTRO */}
          <NotificationProvider>
            {/* 4. HelpProvider DENTRO */}
            <HelpProvider>
              {/* 5. App al final, recibe todos los contextos */}
              <App />
            </HelpProvider>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
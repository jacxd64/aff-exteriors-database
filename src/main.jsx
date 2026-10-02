// Entry point. Seeds the local demo store (no-op in Firebase mode) before the
// first render so the app is populated the moment it loads, then mounts <App>.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { backendName } from './services/db';
import { ensureSeeded } from './services/db/seed';

async function bootstrap() {
  if (backendName === 'local') {
    try {
      await ensureSeeded();
    } catch (err) {
      console.error('Could not seed local demo data:', err);
    }
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();

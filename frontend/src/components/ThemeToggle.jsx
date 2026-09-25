import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle({ currentTheme, onSetTheme }) {
  const isDark = currentTheme === 'dark';

  const handleSelect = (mode) => {
    if (mode === currentTheme) return;

    document.documentElement.classList.add('theme-transitioning');
    onSetTheme(mode);

    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 350);
  };

  return (
    <div className="theme-switch-segmented" role="radiogroup" aria-label="Theme switcher">
      <button
        type="button"
        className={`theme-switch-btn ${!isDark ? 'active' : ''}`}
        onClick={() => handleSelect('light')}
        title="Switch to Light mode"
        aria-checked={!isDark}
        role="radio"
        id="theme-btn-light"
      >
        {!isDark && (
          <motion.div
            layoutId="theme-pill"
            className="theme-switch-slider"
            style={{ inset: 0, zIndex: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <span
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Sun size={13} strokeWidth={2.4} />
          <span>Light</span>
        </span>
      </button>

      <button
        type="button"
        className={`theme-switch-btn ${isDark ? 'active' : ''}`}
        onClick={() => handleSelect('dark')}
        title="Switch to Dark mode"
        aria-checked={isDark}
        role="radio"
        id="theme-btn-dark"
      >
        {isDark && (
          <motion.div
            layoutId="theme-pill"
            className="theme-switch-slider"
            style={{ inset: 0, zIndex: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <span
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Moon size={13} strokeWidth={2.4} />
          <span>Dark</span>
        </span>
      </button>
    </div>
  );
}

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { soundEngine } from '../../utils/audio';
import { ConfirmModal } from './ConfirmModal';
import { ShieldAlert, LogOut, Volume2, VolumeX, Sun, Moon } from 'lucide-react';

/** Single source of truth for the role label + chip tone. */
const ROLE_META = {
  employee: { label: 'Trainee', chip: 'app-chip-brand' },
  supervisor: { label: 'HSE Supervisor', chip: 'app-chip-neutral' },
  admin: { label: 'System Admin', chip: 'app-chip-neutral' },
};

/** Scroll distance, in px, before the bar detaches from the top of the page. */
const FLOAT_AFTER = 12;

export const Navbar = ({ isPracticeMode = false, children }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [isFloating, setIsFloating] = React.useState(false);

  // Detach the bar once the page scrolls. The listener is rAF-throttled rather
  // than read directly, because `scroll` fires far faster than the paint rate
  // and a state flip per event would re-render on every frame.
  React.useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setIsFloating(window.scrollY > FLOAT_AFTER);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const role = ROLE_META[user?.role] || ROLE_META.employee;

  const handleAudio = () => {
    const muted = soundEngine.toggleMute();
    showToast(muted ? 'Sound effects muted' : 'Sound effects enabled', 'info');
    if (!muted) soundEngine.playSuccess();
  };

  const handleTheme = () => {
    toggleTheme();
    soundEngine.playTick();
  };

  return (
    <>
      {/* Two elements, deliberately: a full-bleed sticky BAR and a visible PILL
          inside it. A sticky element ignores left/right insets while at rest and
          shifts sideways the moment it sticks, which is what produced a gap on
          one side of the bar and not the other. Keeping the pill inside also
          locks the brand and the controls to the same alignment as the page
          content below, so nothing drifts apart when the bar floats. */}
      <header
        className={`app-navbar ${isFloating ? 'app-navbar-floating' : 'app-navbar-top'}`}
      >
        <div className="app-navbar-pill">
          <div className="app-page flex h-12 items-center justify-between gap-4 sm:h-[3.25rem]">
          {/* Brand */}
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="app-icon-well h-8 w-8 rounded-control">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold leading-none tracking-tight text-mist-900 dark:text-dark-text sm:text-[15px]">
                HAZARD<span className="text-primary-500">HUNT</span>
              </p>
              <p className="mt-0.5 hidden text-[10px] leading-none text-mist-500 dark:text-dark-muted sm:block">
                Warehouse Safety Perception Trainer
              </p>
            </div>
          </div>

          {/* Optional role-specific nav slot */}
          {children && (
            <nav className="hidden items-center gap-1 md:flex" aria-label="Section">
              {children}
            </nav>
          )}

          {/* Controls */}
          <div className="flex shrink-0 items-center gap-2">
            {isPracticeMode && <span className="app-chip app-chip-caution">Practice</span>}

            <button
              type="button"
              onClick={handleTheme}
              className="app-icon-btn"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={handleAudio}
              className="app-icon-btn"
              title={soundEngine.isMuted ? 'Unmute audio' : 'Mute audio'}
              aria-label={soundEngine.isMuted ? 'Unmute audio' : 'Mute audio'}
            >
              {soundEngine.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {user && (
              <div className="ml-1 flex items-center gap-3 border-l border-mist-200 pl-3 dark:border-dark-border">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-bold leading-tight text-mist-900 dark:text-dark-text">
                    {user.name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-mist-500 dark:text-dark-muted">
                    {role.label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="app-icon-btn hover:border-primary-500 hover:text-primary-600 dark:hover:border-primary-500 dark:hover:text-primary-400"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      {/* Deliberately NOT marked isDestructive. That flag means "this destroys
            something irrecoverable", and it is reserved for the two account-deletion
            dialogs and for discarding a quiz. Signing out terminates a session and
            nothing else - you sign straight back in - so the confirm button renders
            the same primary orange as every other non-destructive action, and the
            eyebrow above it stops labelling a reversible step as Danger. */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Sign out of Hazard Hunt?"
        message={`Any in-progress training attempt for ${user?.name} will be terminated.`}
        confirmText="Sign out"
        cancelText="Stay signed in"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          soundEngine.playWarning();
          logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
};

/**
 * Standard page frame: identical navbar for every role.
 *
 * There is deliberately no footer. It previously carried the project-team
 * credits, but it repeated on every screen of a tool people use dozens of times
 * a day, pushed the actual dashboard content below the fold on a laptop, and
 * competed with the page for attention. The team is credited once, in the
 * README and on the login screen, where a reader is actually looking for it.
 */
export const AppShell = ({ children, nav }) => (
  <div className="flex min-h-screen flex-col bg-app-shell dark:bg-dark-bg">
    <Navbar>{nav}</Navbar>
    <main className="flex-1">{children}</main>
  </div>
);
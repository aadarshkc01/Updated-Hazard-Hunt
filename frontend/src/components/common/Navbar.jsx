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
          <div className="app-page flex h-14 items-center justify-between gap-4 sm:h-16">
          {/* Brand */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="app-icon-well h-10 w-10 rounded-control">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold leading-none tracking-tight text-mist-900 dark:text-dark-text">
                HAZARD<span className="text-primary-500">HUNT</span>
              </p>
              <p className="mt-1 hidden text-[11px] leading-none text-mist-500 dark:text-dark-muted sm:block">
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

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Sign out of Hazard Hunt?"
        message={`Any in-progress training attempt for ${user?.name} will be terminated.`}
        confirmText="Sign out"
        cancelText="Stay signed in"
        isDestructive
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
 * Team credits, shown in the footer.
 *
 * Kept as data rather than markup so the same list can be asserted against and
 * so the names are edited in exactly one place.
 */
export const TEAM = [
  { name: 'Aadarsh K.C.', role: 'Front-End', tag: 'FR' },
  { name: 'Prabin Upadhayay', role: 'Back-End', tag: 'BE' },
  { name: 'Himanshu Bhusal', role: 'Documentation', tag: 'DOC' },
  { name: 'Shishir Pandey', role: 'Presentation', tag: 'PRES' },
];

export const AppFooter = () => (
  <footer className="border-t border-mist-200 bg-white dark:border-dark-border dark:bg-dark-card">
    <div className="app-page py-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="app-eyebrow">Project Team</p>
          <p className="app-title mt-1.5">Hazard Hunt</p>
          <p className="app-body mt-1 max-w-sm">
            © 2026 Macro Thinkers — CET257 Enterprise Project, University of Sunderland.
          </p>
          <p className="app-num app-body mt-2">Automotive Logistics &amp; Warehousing Safety Engine</p>
        </div>

        {/* Team grid. Left-aligned so it reads as a list of credits rather than
            a set of decorative tiles competing with the page content. */}
        <ul className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4 lg:gap-x-8">
          {TEAM.map((member) => (
            <li key={member.name} className="min-w-0">
              <p className="flex items-center gap-1.5">
                <span
                  className="app-num shrink-0 rounded-sm bg-primary-100 px-1 py-0.5 text-[9px] font-bold
                             text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                  aria-hidden="true"
                >
                  {member.tag}
                </span>
                <span className="truncate text-xs font-bold text-mist-800 dark:text-dark-text">
                  {member.name}
                </span>
              </p>
              <p className="app-body mt-0.5 pl-1">{member.role}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </footer>
);

/** Standard page frame: identical navbar + footer for every role. */
export const AppShell = ({ children, nav, footer = true }) => (
  <div className="flex min-h-screen flex-col bg-app-shell dark:bg-dark-bg">
    <Navbar>{nav}</Navbar>
    <main className="flex-1">{children}</main>
    {footer && <AppFooter />}
  </div>
);
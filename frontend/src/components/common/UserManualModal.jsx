import React from 'react';
import { X, Info } from 'lucide-react';

/**
 * Employee quick-start manual.
 *
 * Written as short numbered steps rather than feature descriptions, because it
 * is opened mid-task and read on a phone. Every control the trainee can actually
 * press is named here, including the two ways to stop a session.
 */
export const UserManualModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const Step = ({ title, children }) => (
    <section className="app-stack gap-1">
      <h3 className="app-section-title">{title}</h3>
      <p className="app-body leading-relaxed">{children}</p>
    </section>
  );

  const Controls = ({ rows }) => (
    <table className="app-table">
      <tbody>
        {rows.map(([action, input]) => (
          <tr key={action}>
            <td className="app-td font-semibold">{action}</td>
            <td className="app-td app-num text-mist-500 dark:text-dark-muted">{input}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-mist-950/55 p-4 animate-fade-in"
      role="presentation"
    >
      <div
        className="app-card flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-mist-200 p-5 dark:border-dark-border">
          <div className="min-w-0">
            <p className="app-eyebrow-accent">Employee quick start</p>
            <h2 id="manual-title" className="app-title mt-1">
              Hazard Hunt — Bay 4 Inspection
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close manual"
            className="app-icon-btn shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="app-stack flex-1 gap-5 overflow-y-auto p-5 sm:p-6">
          <Step title="1. Complete the inspection">
            Work through the depot and find all five hazards, then report each one. Hazards are
            re-staged at a different spot on every attempt, so positions cannot be memorised
            between runs.
          </Step>

          <Step title="2. Avoid false reports">
            Report only what you are sure is hazardous. Every false report costs 5% accuracy, so
            looking properly beats clicking quickly.
          </Step>

          <Step title="3. Complete the quiz">
            Answer the HSE questions after the inspection. A composite score of 75% or higher
            passes. Missed risks come back with the required procedure so you can correct them.
          </Step>

          <div className="app-stack gap-2">
            <h3 className="app-section-title">Controls — Warehouse Walkthrough</h3>
            <Controls
              rows={[
                ['Move', 'On foot: left thumb pad'],
                ['Move', 'Desktop: W A S D / arrow keys'],
                ['Look around', 'Drag the right of the screen'],
                ['Look around', 'Desktop: move the mouse'],
                ['Inspect equipment', 'Point the centre reticle at it'],
                ['Report a hazard', 'REPORT button, or tap the hazard'],
                ['Stop and go back', 'Cancel session, or press Esc'],
                ['Restart at the entrance', 'Return to start'],
                ['Fullscreen', 'Fullscreen button'],
              ]}
            />
          </div>

          <div className="app-stack gap-2">
            <h3 className="app-section-title">Controls — Standard 360°</h3>
            <Controls
              rows={[
                ['Look around', 'Drag the view'],
                ['Zoom', 'Scroll or pinch'],
                ['Report a hazard', 'Tap or click it'],
                ['Stop and go back', 'Cancel session, or press Esc'],
              ]}
            />
          </div>

          <Step title="Look at what you are pointing at">
            The centre reticle is live. Point it at a distribution board, charging bay, conveyor,
            dock door, fire point or vehicle and it outlines the item and names it — a quick way to
            learn what belongs on a warehouse floor.
          </Step>

          <Step title="Stop or finish a session at any time">
            <strong className="text-mist-800 dark:text-dark-text">Cancel session</strong> discards
            the attempt entirely — nothing is graded or recorded. <strong className="text-mist-800 dark:text-dark-text">
              Finish early
            </strong>{' '}
            submits what you have found so far, and anything still hidden counts as missed. Both
            buttons sit in the session bar, and <strong className="app-kbd">Esc</strong> opens the
            cancel confirmation anywhere in the inspection.
          </Step>

          <div className="app-alert app-alert-brand">
            <Info className="app-alert-icon" aria-hidden="true" />
            <span>
              Your official result is saved for your HSE supervisor, and your dashboard shows your
              last five scores with the trend. Practice sessions rehearse the material without
              replacing your official result.
            </span>
          </div>
        </div>

        <div className="flex justify-end border-t border-mist-200 p-4 dark:border-dark-border">
          <button type="button" onClick={onClose} className="app-btn app-btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

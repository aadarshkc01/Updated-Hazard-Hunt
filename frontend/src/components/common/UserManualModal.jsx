import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Compass,
  Target,
  AlertTriangle,
  Award,
  Users,
  ShieldCheck,
  Maximize2,
  Volume2,
  CheckCircle2,
  FileText,
  MousePointer,
  HelpCircle,
} from 'lucide-react';

export const UserManualModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('trainee');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-mist-300 dark:border-dark-border overflow-hidden animate-slide-up">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-mist-300 dark:border-dark-border flex items-center justify-between bg-mist-100 dark:bg-dark-surface">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500 text-white flex items-center justify-center shadow-violet">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Documentation & SOP Manual
                </span>
                <span className="text-2xs font-mono px-2 py-0.5 rounded bg-mist-200 dark:bg-dark-card text-mist-700 dark:text-dark-muted font-bold">
                  CET257
                </span>
              </div>
              <h2 className="text-xl font-bold text-mist-950 dark:text-white">
                Hazard Hunt System User Manual
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-mist-600 dark:text-dark-muted hover:bg-mist-200 dark:hover:bg-dark-card hover:text-mist-950 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-mist-300 dark:border-dark-border bg-mist-50 dark:bg-dark-card px-6 overflow-x-auto">
          {[
            { id: 'trainee', label: '1. Trainee Walkthrough', icon: Compass },
            { id: 'controls', label: '2. 360 Controls & Gestures', icon: MousePointer },
            { id: 'hazards', label: '3. Bay 4 Hazards (HSE)', icon: AlertTriangle },
            { id: 'supervisor', label: '4. Supervisor & Admin Guide', icon: Users },
            { id: 'scoring', label: '5. Scoring & Pass Rules', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-4 text-xs font-bold whitespace-nowrap flex items-center space-x-2 border-b-2 transition-all ${
                  isActive
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-white dark:bg-dark-surface'
                    : 'border-transparent text-mist-600 dark:text-dark-muted hover:text-mist-950 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-mist-900 dark:text-dark-text text-sm">
          {/* TAB 1: TRAINEE WALKTHROUGH */}
          {activeTab === 'trainee' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/50">
                <h3 className="font-bold text-violet-900 dark:text-violet-200 mb-1 flex items-center">
                  <Target className="w-4 h-4 mr-1.5 text-violet-600" />
                  What is Hazard Hunt?
                </h3>
                <p className="text-xs text-mist-800 dark:text-violet-300 leading-relaxed">
                  Hazard Hunt replaces passive, poster-based warehouse safety training with an interactive, browser-based 360° perception challenge. As a trainee in automotive logistics Bay 4, your objective is to spot and flag 5 critical safety infractions before the 90-second countdown runs out.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-mist-100 dark:bg-dark-surface border border-mist-300 dark:border-dark-border">
                  <div className="w-8 h-8 rounded-xl bg-violet-500 text-white flex items-center justify-center font-bold text-sm mb-2 shadow-violet">
                    1
                  </div>
                  <h4 className="font-bold text-mist-950 dark:text-white mb-1">Calibration Sandbox</h4>
                  <p className="text-xs text-mist-700 dark:text-dark-muted">
                    Before the timed sweep, complete a short gesture calibration: rotate the 360 camera and click a demo practice target.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-mist-100 dark:bg-dark-surface border border-mist-300 dark:border-dark-border">
                  <div className="w-8 h-8 rounded-xl bg-violet-500 text-white flex items-center justify-center font-bold text-sm mb-2 shadow-violet">
                    2
                  </div>
                  <h4 className="font-bold text-mist-950 dark:text-white mb-1">Spot 5 Real Hazards</h4>
                  <p className="text-xs text-mist-700 dark:text-dark-muted">
                    Pan 360° and click hazards. Correct spots earn +20% score. False clicks on non-hazards deduct 5% penalty.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-mist-100 dark:bg-dark-surface border border-mist-300 dark:border-dark-border">
                  <div className="w-8 h-8 rounded-xl bg-violet-500 text-white flex items-center justify-center font-bold text-sm mb-2 shadow-violet">
                    3
                  </div>
                  <h4 className="font-bold text-mist-950 dark:text-white mb-1">HSE Knowledge Quiz</h4>
                  <p className="text-xs text-mist-700 dark:text-dark-muted">
                    Answer 4 multiple choice questions testing UK HSE, COSHH, and warehouse standards. Minimum 75% required to pass.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTROLS & GESTURES */}
          {activeTab === 'controls' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="font-bold text-base text-mist-950 dark:text-white">
                Navigation & Gesture Mechanics
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-mist-100 dark:bg-dark-surface border border-mist-300 dark:border-dark-border">
                  <h4 className="font-bold text-mist-950 dark:text-white flex items-center mb-2">
                    <MousePointer className="w-4 h-4 mr-2 text-violet-500" />
                    Mouse & Touch Controls
                  </h4>
                  <ul className="space-y-2 text-xs text-mist-700 dark:text-dark-muted">
                    <li>• <strong>Click & Drag:</strong> Smoothly rotate your viewpoint around Bay 4. Dragging is automatically filtered so you will never trigger accidental clicks while looking around!</li>
                    <li>• <strong>Stationary Click:</strong> Click directly on a suspicious object without moving the mouse to report a hazard.</li>
                    <li>• <strong>Touch / Mobile:</strong> Swipe with your finger to rotate, tap to flag.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-mist-100 dark:bg-dark-surface border border-mist-300 dark:border-dark-border">
                  <h4 className="font-bold text-mist-950 dark:text-white flex items-center mb-2">
                    <Compass className="w-4 h-4 mr-2 text-violet-500" />
                    Keyboard Shortcuts & Fullscreen
                  </h4>
                  <ul className="space-y-2 text-xs text-mist-700 dark:text-dark-muted">
                    <li>• <strong>Arrow Keys (←, →):</strong> Pan camera horizontally left and right.</li>
                    <li>• <strong>Arrow Keys (↑, ↓):</strong> Tilt camera up towards racking or down towards floor.</li>
                    <li>• <strong>Fullscreen Button:</strong> Click the expand icon on the HUD to expand the 360 viewer to full monitor immersion. Press <code>Esc</code> to exit.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BAY 4 HAZARDS GUIDE */}
          {activeTab === 'hazards' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-base text-mist-950 dark:text-white">
                Target Hazards & HSE Regulations (Bay 4)
              </h3>
              <p className="text-xs text-mist-700 dark:text-dark-muted">
                The 5 hidden hazards simulate actual industrial risks audited under UK Health & Safety Executive (HSE) standards:
              </p>

              <div className="space-y-3">
                {[
                  {
                    title: 'Hydraulic Fluid / Chemical Spill',
                    cat: 'Chemical & Slip Risk (COSHH)',
                    rule: 'Uncontained fluid pooling creates acute slip hazards. Must cordon off immediately and deploy absorbent materials.',
                    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200',
                  },
                  {
                    title: 'Unstable Leaning Pallet Stack',
                    cat: 'Material Handling & Storage',
                    rule: 'Fractured bottom deckboard and uneven overhang risks catastrophic load collapse over pedestrian aisles. Transfer load immediately.',
                    color: 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200',
                  },
                  {
                    title: 'Blocked Emergency Fire Exit',
                    cat: 'Fire Safety Order 2005',
                    rule: 'Stacked crates obstructing push-bar escape doors violate UK fire legislation. Egress paths must remain 100% unobstructed 24/7.',
                    color: 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200',
                  },
                  {
                    title: 'Exposed Trailing 415V Industrial Cable',
                    cat: 'Electricity at Work Regulations',
                    rule: 'Three-phase cable routed across pedestrian footways without rubber ramps presents trip and electric shock hazards.',
                    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200',
                  },
                  {
                    title: 'Forklift Blind Intersection',
                    cat: 'Workplace Transport Safety',
                    rule: 'High-rack corner lacking parabolic mirror and pedestrian segregation. FLTs and pedestrians require positive physical separation.',
                    color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40 border-violet-200',
                  },
                ].map((item, idx) => (
                  <div key={idx} className={`p-3.5 rounded-2xl border ${item.color}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">{item.title}</span>
                      <span className="text-2xs font-mono font-bold uppercase">{item.cat}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-mist-800 dark:text-mist-200">{item.rule}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SUPERVISOR & ADMIN GUIDE */}
          {activeTab === 'supervisor' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="font-bold text-base text-mist-950 dark:text-white">
                Supervisor & Administrator Console Operations
              </h3>

              <div className="space-y-4 text-xs text-mist-700 dark:text-dark-muted">
                <div className="p-4 rounded-2xl bg-mist-100 dark:bg-dark-surface border border-mist-300 dark:border-dark-border">
                  <h4 className="font-bold text-mist-950 dark:text-white mb-1.5 flex items-center">
                    <BarChart3Icon className="w-4 h-4 mr-2 text-violet-500" />
                    Real-Time Hazard Vulnerability Radar
                  </h4>
                  <p>
                    The radar tracks percentage failure rates across all 5 hazard categories. If more than 40% of trainees miss Chemical or Electrical hazards, the category automatically flags as <strong>CRITICAL RISK</strong>, alerting supervisors to schedule immediate practical toolbox talks.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-mist-100 dark:bg-dark-surface border border-mist-300 dark:border-dark-border">
                  <h4 className="font-bold text-mist-950 dark:text-white mb-1.5 flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-violet-500" />
                    Trainee Audit Dossier & CSV Export
                  </h4>
                  <p>
                    Click on any trainee in the compliance table to slide out their individual audit dossier. You can inspect every hazard they found, every hazard missed, their exact quiz answers, and export complete audit logs to RFC 4180 CSV with one click.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-mist-100 dark:bg-dark-surface border border-mist-300 dark:border-dark-border">
                  <h4 className="font-bold text-mist-950 dark:text-white mb-1.5 flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-2 text-violet-500" />
                    Role Provisioning Rules
                  </h4>
                  <p>
                    No public sign-up is permitted. HSE Supervisors can issue credentials for <strong>Employees (Trainees)</strong> only. System Administrators possess clearance to provision both Supervisors and Employees.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SCORING RULES */}
          {activeTab === 'scoring' && (
            <div className="space-y-5 animate-fade-in">
              <h3 className="font-bold text-base text-mist-950 dark:text-white">
                Scoring Formula & Pass Threshold
              </h3>

              <div className="p-4 rounded-2xl bg-mist-100 dark:bg-dark-surface border border-mist-300 dark:border-dark-border space-y-3">
                <div className="font-mono text-xs bg-white dark:bg-dark-card p-3 rounded-xl border border-mist-300 dark:border-dark-border text-violet-600 dark:text-violet-400 font-bold">
                  Composite Score = (Hazard Perception Score × 0.60) + (Quiz Score × 0.40)
                </div>

                <ul className="space-y-2 text-xs text-mist-700 dark:text-dark-muted">
                  <li>• <strong>Hazard Score:</strong> Base detection rate (up to 100%) minus 5% penalty per false click.</li>
                  <li>• <strong>Quiz Score:</strong> Percentage of correct multiple-choice questions (4 questions total).</li>
                  <li>• <strong>Passing Standard:</strong> An overall composite score of <strong>75% or higher</strong> is mandatory for UK HSE certified compliance.</li>
                  <li>• <strong>Practice Mode:</strong> Trainees who fail or wish to practice can retry in Practice Mode. Practice attempts are clearly watermarked and never overwrite the official audit.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-mist-300 dark:border-dark-border bg-mist-100 dark:bg-dark-surface flex items-center justify-between">
          <span className="text-xs text-mist-600 dark:text-dark-muted">
            CET257 Enterprise Project • Team: Macro Thinkers
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold transition-all shadow-violet"
          >
            Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};

function BarChart3Icon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20V10m6 10V4M6 20v-4" />
    </svg>
  );
}

"use client";

import type { Mood, Species } from "@/lib/pets";

/**
 * The creatures, drawn as SVG rather than typed as emoji so they can actually
 * animate — breathing, blinking, and a reaction when fed.
 *
 * Keyframes are scoped to this component instead of globals.css so the pet
 * feature stays self-contained. Reduced motion is honoured here too: the
 * global rule in globals.css already neutralises these, and the styles below
 * repeat the guard so the component is safe if lifted elsewhere.
 */

const STYLES = `
@keyframes pet-float   { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-5px)} }
@keyframes pet-breathe { 0%,100%{transform:scale(1,1)}      50%{transform:scale(1.04,0.97)} }
@keyframes pet-blink   { 0%,92%,100%{transform:scaleY(1)}   96%{transform:scaleY(0.1)} }
@keyframes pet-sway    { 0%,100%{transform:rotate(-7deg)}   50%{transform:rotate(7deg)} }
@keyframes pet-flicker { 0%,100%{transform:scale(1,1)}      35%{transform:scale(0.95,1.06)} 70%{transform:scale(1.05,0.96)} }
@keyframes pet-spark   { 0%{opacity:0;transform:translateY(0) scale(0.5)}
                         30%{opacity:1}
                         100%{opacity:0;transform:translateY(-26px) scale(1.1)} }
@keyframes pet-wisp    { 0%,100%{transform:translateX(0);opacity:.5} 50%{transform:translateX(5px);opacity:.85} }
@keyframes pet-bounce  { 0%,100%{transform:translateY(0)} 30%{transform:translateY(-12px)} 55%{transform:translateY(0)} 70%{transform:translateY(-5px)} }

.pet-root      { animation: pet-float 4s ease-in-out infinite; transform-origin: center; }
.pet-root.fed  { animation: pet-bounce 0.9s cubic-bezier(.3,1.4,.5,1) 1; }
.pet-body      { animation: pet-breathe 3.4s ease-in-out infinite; transform-origin: center bottom; }
.pet-eye       { animation: pet-blink 5.5s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.pet-leaf-l    { animation: pet-sway 3.8s ease-in-out infinite; transform-origin: bottom right; transform-box: fill-box; }
.pet-leaf-r    { animation: pet-sway 3.8s ease-in-out infinite reverse; transform-origin: bottom left; transform-box: fill-box; }
.pet-flame     { animation: pet-flicker 1.5s ease-in-out infinite; transform-origin: center bottom; transform-box: fill-box; }
.pet-spark     { animation: pet-spark 2.4s ease-out infinite; transform-box: fill-box; }
.pet-spark-2   { animation-delay: .8s; }
.pet-spark-3   { animation-delay: 1.6s; }
.pet-wisp      { animation: pet-wisp 3s ease-in-out infinite; transform-box: fill-box; }

/* Neglect slows everything down — the creature visibly loses energy. */
.pet-sad .pet-root, .pet-sad .pet-body, .pet-sad .pet-flame { animation-duration: 7s; }

@media (prefers-reduced-motion: reduce) {
  .pet-root, .pet-body, .pet-eye, .pet-leaf-l, .pet-leaf-r,
  .pet-flame, .pet-spark, .pet-wisp { animation: none !important; }
}
`;

/** Eyes and mouth carry the mood; the body stays the same. */
function Face({ mood, cx, cy, dark }: { mood: Mood; cx: number; cy: number; dark: string }) {
  const eyeY = cy;
  const lx = cx - 11;
  const rx = cx + 11;

  if (mood === "happy") {
    return (
      <g fill="none" stroke={dark} strokeWidth="2.6" strokeLinecap="round">
        <path d={`M${lx - 5},${eyeY + 1} q5,-6 10,0`} />
        <path d={`M${rx - 5},${eyeY + 1} q5,-6 10,0`} />
        <path d={`M${cx - 6},${eyeY + 11} q6,6 12,0`} />
      </g>
    );
  }

  const droop = mood === "sad" ? 2.5 : 0;
  return (
    <g fill={dark}>
      <ellipse className="pet-eye" cx={lx} cy={eyeY + droop} rx="3.1" ry="4" />
      <ellipse className="pet-eye" cx={rx} cy={eyeY + droop} rx="3.1" ry="4" />
      {mood === "sad" ? (
        <path
          d={`M${cx - 5},${eyeY + 14} q5,-4 10,0`}
          fill="none"
          stroke={dark}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      ) : (
        <path
          d={`M${cx - 4},${eyeY + 11} q4,3.5 8,0`}
          fill="none"
          stroke={dark}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

function Nimbus({ mood, body, accent }: { mood: Mood; body: string; accent: string }) {
  return (
    <>
      <g className="pet-body">
        {/* Cloud built from overlapping lobes rather than one path, so the
            silhouette stays soft at any size. */}
        <ellipse cx="60" cy="72" rx="34" ry="22" fill={body} />
        <circle cx="42" cy="60" r="18" fill={body} />
        <circle cx="63" cy="52" r="22" fill={body} />
        <circle cx="82" cy="63" r="16" fill={body} />
        <ellipse cx="60" cy="80" rx="30" ry="12" fill={accent} opacity="0.25" />
      </g>
      <Face mood={mood} cx={62} cy={62} dark="#22384a" />
      <g fill={accent} opacity="0.55">
        <ellipse className="pet-wisp" cx="34" cy="94" rx="7" ry="2.6" />
        <ellipse className="pet-wisp" cx="60" cy="100" rx="10" ry="3" style={{ animationDelay: "0.7s" }} />
        <ellipse className="pet-wisp" cx="86" cy="93" rx="6" ry="2.4" style={{ animationDelay: "1.4s" }} />
      </g>
    </>
  );
}

function Sprout({ mood, body, accent }: { mood: Mood; body: string; accent: string }) {
  return (
    <>
      <g className="pet-body">
        <path d="M60 96 C40 96 34 82 34 70 C34 54 46 42 60 42 C74 42 86 54 86 70 C86 82 80 96 60 96 Z" fill={body} />
        <path d="M60 96 C46 96 39 88 36 79 C44 86 52 88 60 88 C68 88 76 86 84 79 C81 88 74 96 60 96 Z" fill={accent} opacity="0.3" />
      </g>
      {/* Stem and leaves sit above the bulb and sway independently. */}
      <path d="M60 42 L60 26" stroke={accent} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path className="pet-leaf-l" d="M60 32 C48 30 40 22 42 14 C52 13 59 21 60 32 Z" fill={accent} />
      <path className="pet-leaf-r" d="M60 28 C72 26 80 18 78 10 C68 9 61 17 60 28 Z" fill={body} />
      <Face mood={mood} cx={60} cy={66} dark="#243a26" />
    </>
  );
}

function Ember({ mood, body, accent }: { mood: Mood; body: string; accent: string }) {
  return (
    <>
      <g className="pet-flame">
        <path
          d="M60 20 C74 40 88 50 88 68 C88 86 76 98 60 98 C44 98 32 86 32 68 C32 50 46 40 60 20 Z"
          fill={accent}
        />
        <path
          d="M60 40 C69 54 78 60 78 71 C78 83 70 91 60 91 C50 91 42 83 42 71 C42 60 51 54 60 40 Z"
          fill={body}
        />
      </g>
      <Face mood={mood} cx={60} cy={70} dark="#4a2410" />
      <g fill={accent}>
        <circle className="pet-spark" cx="38" cy="46" r="2.6" />
        <circle className="pet-spark pet-spark-2" cx="82" cy="40" r="2" />
        <circle className="pet-spark pet-spark-3" cx="60" cy="30" r="1.8" />
      </g>
    </>
  );
}

const RENDER = { nimbus: Nimbus, sprout: Sprout, ember: Ember };

export function PetCreature({
  species,
  mood = "content",
  size = 140,
  fed = false,
  body,
  accent,
}: {
  species: Species;
  mood?: Mood;
  size?: number;
  /** Set briefly after feeding to play the bounce. */
  fed?: boolean;
  body: string;
  accent: string;
}) {
  const Creature = RENDER[species];
  return (
    <div className={mood === "sad" ? "pet-sad" : undefined}>
      <style>{STYLES}</style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        role="img"
        aria-label={`${species}, looking ${mood}`}
      >
        <g className={`pet-root${fed ? " fed" : ""}`}>
          <Creature mood={mood} body={body} accent={accent} />
        </g>
      </svg>
    </div>
  );
}

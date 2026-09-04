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
@keyframes pet-wobble  { 0%,100%{transform:scale(1,1)} 25%{transform:scale(1.08,0.93)} 50%{transform:scale(0.94,1.07)} 75%{transform:scale(1.05,0.96)} }
@keyframes pet-flap-l  { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-24deg)} }
@keyframes pet-flap-r  { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(24deg)} }
@keyframes pet-twinkle { 0%,100%{opacity:.35;transform:scale(.8) rotate(0deg)} 50%{opacity:1;transform:scale(1.15) rotate(45deg)} }
@keyframes pet-drip    { 0%{opacity:0;transform:translateY(0) scaleY(.6)} 25%{opacity:.8} 100%{opacity:0;transform:translateY(16px) scaleY(1.3)} }
@keyframes pet-ring    { 0%{opacity:.5;transform:scale(.6)} 100%{opacity:0;transform:scale(1.5)} }

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
.pet-wobble    { animation: pet-wobble 2.6s ease-in-out infinite; transform-origin: center bottom; transform-box: fill-box; }
.pet-wing-l    { animation: pet-flap-l 0.9s ease-in-out infinite; transform-origin: right center; transform-box: fill-box; }
.pet-wing-r    { animation: pet-flap-r 0.9s ease-in-out infinite; transform-origin: left center; transform-box: fill-box; }
.pet-twinkle   { animation: pet-twinkle 2.8s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.pet-drip      { animation: pet-drip 3.2s ease-in infinite; transform-box: fill-box; }
.pet-ring      { animation: pet-ring 3s ease-out infinite; transform-origin: center; transform-box: fill-box; }

/* Neglect slows everything down — the creature visibly loses energy. */
.pet-sad .pet-root, .pet-sad .pet-body, .pet-sad .pet-flame { animation-duration: 7s; }

@media (prefers-reduced-motion: reduce) {
  .pet-root, .pet-body, .pet-eye, .pet-leaf-l, .pet-leaf-r,
  .pet-flame, .pet-spark, .pet-wisp, .pet-wobble, .pet-wing-l, .pet-wing-r,
  .pet-twinkle, .pet-drip, .pet-ring { animation: none !important; }
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


function Pebble({ mood, body, accent }: { mood: Mood; body: string; accent: string }) {
  return (
    <>
      <g className="pet-body">
        {/* Irregular outline — a perfect oval would read as an egg, not a stone. */}
        <path
          d="M28 74 C26 58 38 44 58 42 C78 40 92 52 94 68 C96 84 84 96 62 97 C42 98 30 90 28 74 Z"
          fill={body}
        />
        <path d="M34 66 C40 52 54 46 66 47 C56 50 46 56 40 68 Z" fill="#ffffff" opacity="0.18" />
      </g>
      {/* Moss */}
      <g fill={accent}>
        <path d="M40 46 C46 38 56 36 62 40 C56 41 50 44 46 50 Z" />
        <circle cx="52" cy="40" r="4" />
        <circle cx="62" cy="38" r="3" />
        <circle cx="43" cy="44" r="3.4" />
      </g>
      <Face mood={mood} cx={60} cy={70} dark="#3a352e" />
    </>
  );
}

function Ripple({ mood, body, accent }: { mood: Mood; body: string; accent: string }) {
  return (
    <>
      <g fill="none" stroke={accent} strokeWidth="2" opacity="0.5">
        <ellipse className="pet-ring" cx="60" cy="96" rx="24" ry="7" />
        <ellipse className="pet-ring" cx="60" cy="96" rx="24" ry="7" style={{ animationDelay: "1.5s" }} />
      </g>
      <g className="pet-wobble">
        {/* Classic droplet: pointed top, round belly. */}
        <path d="M60 24 C74 46 86 58 86 72 C86 87 74 96 60 96 C46 96 34 87 34 72 C34 58 46 46 60 24 Z" fill={body} />
        <ellipse cx="48" cy="62" rx="7" ry="10" fill="#ffffff" opacity="0.3" transform="rotate(-20 48 62)" />
      </g>
      <Face mood={mood} cx={60} cy={70} dark="#123a4a" />
      <ellipse className="pet-drip" cx="60" cy="98" rx="3" ry="5" fill={accent} opacity="0.7" />
    </>
  );
}

function MothPet({ mood, body, accent }: { mood: Mood; body: string; accent: string }) {
  return (
    <>
      <g className="pet-root">
        <path className="pet-wing-l" d="M56 62 C36 44 20 48 20 64 C20 80 38 86 56 76 Z" fill={body} />
        <path className="pet-wing-r" d="M64 62 C84 44 100 48 100 64 C100 80 82 86 64 76 Z" fill={body} />
        <path className="pet-wing-l" d="M56 72 C42 68 32 76 34 86 C42 92 52 86 56 78 Z" fill={accent} opacity="0.65" />
        <path className="pet-wing-r" d="M64 72 C78 68 88 76 86 86 C78 92 68 86 64 78 Z" fill={accent} opacity="0.65" />
      </g>
      <g className="pet-body">
        <ellipse cx="60" cy="70" rx="9" ry="19" fill={accent} />
        <ellipse cx="60" cy="55" rx="9.5" ry="9" fill={accent} />
      </g>
      {/* Antennae */}
      <g stroke={accent} strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M55 47 C50 38 46 34 42 32" />
        <path d="M65 47 C70 38 74 34 78 32" />
      </g>
      <Face mood={mood} cx={60} cy={54} dark="#3d3226" />
    </>
  );
}

function StarPet({ mood, body, accent }: { mood: Mood; body: string; accent: string }) {
  return (
    <>
      <g className="pet-body">
        {/* Soft-cornered five-point star — sharp points look like clip-art. */}
        <path
          d="M60 22 C63 22 65 24 66 27 L72 46 L92 46 C96 46 99 49 99 52 C99 55 97 57 94 59 L78 71 L84 90
             C85 94 83 97 80 98 C77 99 75 98 72 96 L60 85 L48 96 C45 98 43 99 40 98 C37 97 35 94 36 90
             L42 71 L26 59 C23 57 21 55 21 52 C21 49 24 46 28 46 L48 46 L54 27 C55 24 57 22 60 22 Z"
          fill={body}
        />
      </g>
      <Face mood={mood} cx={60} cy={58} dark="#6b5210" />
      <g fill={accent}>
        <path className="pet-twinkle" d="M26 30 l2.5 5.5 5.5 2.5 -5.5 2.5 -2.5 5.5 -2.5 -5.5 -5.5 -2.5 5.5 -2.5 Z" />
        <path
          className="pet-twinkle"
          d="M96 76 l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2 Z"
          style={{ animationDelay: "1.2s" }}
        />
      </g>
    </>
  );
}

function Blot({ mood, body, accent }: { mood: Mood; body: string; accent: string }) {
  return (
    <>
      <g className="pet-wobble">
        {/* Deliberately lopsided — a spill, not a shape. */}
        <path
          d="M32 66 C30 50 42 38 58 37 C74 36 90 44 92 60 C94 74 88 84 76 90
             C70 93 66 98 60 97 C52 96 50 90 42 86 C34 82 33 74 32 66 Z"
          fill={body}
        />
        <path d="M88 82 C94 84 97 90 94 94 C90 97 85 94 84 89 Z" fill={body} />
        <ellipse cx="46" cy="54" rx="8" ry="6" fill="#ffffff" opacity="0.16" transform="rotate(-25 46 54)" />
      </g>
      <Face mood={mood} cx={60} cy={64} dark="#232640" />
      <circle className="pet-drip" cx="72" cy="96" r="3" fill={accent} opacity="0.6" />
    </>
  );
}

const RENDER: Record<Species, typeof Nimbus> = {
  nimbus: Nimbus,
  sprout: Sprout,
  ember: Ember,
  pebble: Pebble,
  ripple: Ripple,
  moth: MothPet,
  star: StarPet,
  blot: Blot,
};

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

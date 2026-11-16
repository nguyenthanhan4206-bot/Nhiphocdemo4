import React, { useState } from 'react';
import { motion } from 'motion/react';
import { playMascotSound } from '../utils/soundEffects';

export type MascotMood = 'happy' | 'trying' | 'surprised' | 'relax' | 'study' | 'creative';

interface MascotAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  mood?: MascotMood;
  dark?: boolean;
  className?: string;
}

export const NhiphocLogoMark: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <motion.svg
    viewBox="0 0 64 64"
    fill="none"
    className={className}
    aria-hidden="true"
    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.12 }}
    transition={{ duration: 0.45 }}
  >
    {/* Warm Orbit Swirl Around Star */}
    <motion.path
      d="M8 40C12 50 25 56 40 51C53 46 59 33 54 22"
      stroke="#C45A15"
      strokeWidth="3.8"
      strokeLinecap="round"
      animate={{ pathLength: [0.92, 1, 0.92] }}
      transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
    />
    {/* Cute Animated Golden Star */}
    <motion.g
      style={{ transformOrigin: '32px 30px' }}
      animate={{ scale: [1, 1.07, 1], rotate: [-2, 3, -2] }}
      transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
    >
      <path
        d="M32 10L38.2 22.8L52.2 24.8L42 34.7L44.4 48.6L32 42L19.6 48.6L22 34.7L11.8 24.8L25.8 22.8L32 10Z"
        fill="#F8C65B"
        stroke="#5A351E"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* Star Glossy Highlight */}
      <path
        d="M31.5 16L28.5 23.8L20.5 25.5"
        stroke="#FFF7DE"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </motion.g>
    {/* Orbit Sparkle Star Dot */}
    <motion.circle
      cx="54"
      cy="16"
      r="3.2"
      fill="#C45A15"
      animate={{ scale: [1, 1.35, 1], opacity: [0.85, 1, 0.85] }}
      transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
    />
  </motion.svg>
);

export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  size = 'md',
  mood = 'happy',
  dark = false,
  className = '',
}) => {
  const uid = React.useId().replace(/:/g, '');
  const [hopCount, setHopCount] = useState(0);

  const showScene = size === 'lg' || size === 'xl' || size === '2xl';

  const dims = {
    sm: 'w-11 h-11',
    md: 'w-14 h-14',
    lg: 'w-28 h-24',
    xl: 'w-36 h-28 sm:w-40 sm:h-32',
    '2xl': 'w-48 h-40 sm:w-56 sm:h-44',
  }[size];

  const idleAnimate =
    mood === 'happy' || mood === 'creative'
      ? { y: [0, -5, 0], rotate: [0, -2, 2, 0] }
      : mood === 'trying'
        ? { y: [0, -6, 0], scale: [1, 1.03, 1] }
        : mood === 'surprised'
          ? { y: [0, -4, 0], rotate: [-1.5, 1.5, -1.5] }
          : mood === 'relax'
            ? { y: [0, -2.5, 0], rotate: [-1.5, 1.5, -1.5] }
            : { y: [0, -3.5, 0] };

  const idleDuration = mood === 'trying' || mood === 'creative' ? 1.4 : mood === 'relax' ? 3.2 : 2.2;

  return (
    <motion.div
      key={hopCount}
      onClick={() => {
        playMascotSound(mood);
        setHopCount((c) => c + 1);
      }}
      whileHover={{ scale: 1.05, rotate: 1.5 }}
      whileTap={{ scale: 0.94, y: 3 }}
      initial={hopCount > 0 ? { y: -14, scale: 1.08 } : false}
      animate={{ y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 16 }}
      className={`${dims} flex items-center justify-center shrink-0 select-none cursor-pointer ${className}`}
      data-custom-sound="true"
      role="img"
      aria-label="Linh vật Nhịp Nhỏ — bấm để nghe tiếng vui nhộn"
      title="Nhấn vào Nhịp Nhỏ!"
    >
      <svg
        viewBox={showScene ? '-10 2 136 100' : '12 8 87 92'}
        className="w-full h-full overflow-visible"
        fill="none"
      >
        <defs>
          <linearGradient id={`${uid}-body`} x1="34" y1="36" x2="74" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFE48F" />
            <stop offset="55%" stopColor="#F8C65B" />
            <stop offset="100%" stopColor="#EEAD3E" />
          </linearGradient>
          <linearGradient id={`${uid}-wood`} x1="38" y1="14" x2="72" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF0D6" />
            <stop offset="100%" stopColor="#F5D3A8" />
          </linearGradient>
          <linearGradient id={`${uid}-pack`} x1="66" y1="48" x2="90" y2="84" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EB7A3C" />
            <stop offset="100%" stopColor="#C45A15" />
          </linearGradient>
        </defs>

        {/* Open Study-Corner Props (Books, Doodle Notes & Paper Airplane — NO square box!) */}
        {showScene && (
          <g>
            {/* Soft Organic Backdrop Glow Behind Study Props */}
            <ellipse
              cx="57"
              cy="56"
              rx="52"
              ry="34"
              fill={dark ? '#2D261E' : '#FBECC3'}
              opacity={dark ? 0.55 : 0.65}
            />

            {/* Ground Shadow Spanning Books + Pencil + Sketchbook */}
            <ellipse
              cx="56"
              cy="95"
              rx="48"
              ry="5"
              fill="#5A351E"
              opacity={dark ? 0.35 : 0.12}
            />

            {/* Left Stack of Cozy Study Books */}
            <g transform="translate(-4, 0)">
              {/* Bottom Sage Book */}
              <rect
                x="1"
                y="78"
                width="29"
                height="13"
                rx="3.5"
                fill="#5A8F73"
                stroke="#5A351E"
                strokeWidth="2.3"
              />
              <rect x="6" y="81" width="21" height="6.5" rx="2" fill="#FBF8F1" />
              {/* Hanging Orange Bookmark Ribbon */}
              <path
                d="M11 88V96L13.5 94L16 96V88"
                fill="#C45A15"
                stroke="#5A351E"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              {/* Top Coral-Peach Notebook */}
              <rect
                x="4"
                y="65"
                width="25"
                height="13"
                rx="3.5"
                fill="#E88663"
                stroke="#5A351E"
                strokeWidth="2.3"
              />
              <path d="M9 71.5H25" stroke="#FFF6E6" strokeWidth="2.4" strokeLinecap="round" />
              {/* Tiny Pencil Doodle Squiggle & Star Floating Above Books */}
              <motion.g
                animate={{ y: [0, -3.5, 0], rotate: [-4, 4, -4] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
              >
                <path
                  d="M6 34C10 28 16 32 19 26"
                  stroke="#C45A15"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeDasharray="3 3"
                />
                <path
                  d="M14 44L15.8 48L19.8 49.6L15.8 51.2L14 55.2L12.2 51.2L8.2 49.6L12.2 48L14 44Z"
                  fill="#F8C65B"
                  stroke="#5A351E"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </motion.g>
            </g>

            {/* Right Open Doodle Sketchpad + Floating Paper Airplane */}
            <g>
              {/* Cute Tilted Doodle Sketchbook on the Right */}
              <motion.g
                style={{ transformOrigin: '104px 74px' }}
                animate={{ rotate: [3, 6, 3], y: [0, -2, 0] }}
                transition={{ repeat: Infinity, duration: 3.1, ease: 'easeInOut' }}
              >
                <rect
                  x="91"
                  y="60"
                  width="26"
                  height="28"
                  rx="4.5"
                  fill="#FFFDF6"
                  stroke="#5A351E"
                  strokeWidth="2.3"
                />
                {/* Spiral Notebook Rings */}
                <circle cx="96" cy="60" r="1.8" fill="#C45A15" />
                <circle cx="104" cy="60" r="1.8" fill="#C45A15" />
                <circle cx="112" cy="60" r="1.8" fill="#C45A15" />
                {/* Cute Hand-Drawn Checkmark + Heart + Lines Inside */}
                <path
                  d="M96 68L99 71L105 65"
                  stroke="#3F6A52"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M96 76H111M96 81H107"
                  stroke="#DFCFA8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="110" cy="70" r="2.2" fill="#F8C65B" />
              </motion.g>

              {/* Floating Cute Paper Airplane Top-Right */}
              <motion.g
                animate={{ x: [0, 3, 0], y: [0, -4, 0], rotate: [-4, 3, -4] }}
                transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
              >
                <path
                  d="M94 26L116 17L107 35L102 29L94 26Z"
                  fill="#FFF8E3"
                  stroke="#5A351E"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M116 17L102 29" stroke="#C45A15" strokeWidth="1.6" strokeLinecap="round" />
                <path
                  d="M89 35C92 33 95 35 97 32"
                  stroke="#C45A15"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeDasharray="2.5 2.5"
                />
              </motion.g>
            </g>
          </g>
        )}

        <motion.g
          style={{ transformOrigin: '55px 88px' }}
          animate={idleAnimate}
          transition={{ repeat: Infinity, duration: idleDuration, ease: 'easeInOut' }}
        >
          {/* Soft Ground Shadow (compact mode) */}
          {!showScene && (
            <ellipse cx="55" cy="97" rx="24" ry="4.5" fill="#5A351E" opacity={dark ? 0.35 : 0.12} />
          )}

        {/* Puffy Rounded Backpack Behind Right Shoulder */}
        <path
          d="M66 50C76 47 88 53 88 66C88 78 80 84 68 83L64 81V51L66 50Z"
          fill={`url(#${uid}-pack)`}
          stroke="#5A351E"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        {/* Backpack Top Flap & Pocket Detail */}
        <path
          d="M71 58C77 58 82 61 83 65"
          stroke="#FDE5BE"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <rect
          x="73"
          y="68"
          width="9"
          height="7"
          rx="3"
          fill="#DA6A28"
          stroke="#5A351E"
          strokeWidth="2"
        />

        {/* Chubby Left & Right Arms (Filled Plump Shapes) */}
        {mood === 'happy' ? (
          <>
            {/* Left arm waving up happily */}
            <path
              d="M35 58C26 55 18 47 21 39C23 34 29 35 31 40C32 44 35 48 38 50"
              fill="#FBD372"
              stroke="#5A351E"
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right arm hugging backpack side */}
            <path
              d="M73 59C79 62 82 69 78 73C75 76 70 74 68 70"
              fill="#F6BE52"
              stroke="#5A351E"
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : mood === 'trying' || mood === 'creative' ? (
          <>
            {/* Both chubby arms raised in cheer */}
            <path
              d="M35 57C25 53 19 44 23 37C25 33 31 35 32 40C33 45 35 48 38 50"
              fill="#FBD372"
              stroke="#5A351E"
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M74 57C84 53 90 44 86 37C84 33 78 35 77 40C76 45 74 48 71 50"
              fill="#F6BE52"
              stroke="#5A351E"
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : mood === 'surprised' ? (
          <>
            <path
              d="M35 59C26 57 20 51 22 45C24 41 29 42 31 46C32 49 34 51 37 52"
              fill="#FBD372"
              stroke="#5A351E"
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M74 59C83 57 89 51 87 45C85 41 80 42 78 46C77 49 75 51 72 52"
              fill="#F6BE52"
              stroke="#5A351E"
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            <path
              d="M35 58C27 61 24 68 27 72C30 76 35 73 37 68"
              fill="#FBD372"
              stroke="#5A351E"
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M74 58C82 61 85 68 82 72C79 76 74 73 72 68"
              fill="#F6BE52"
              stroke="#5A351E"
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Chubby Little Feet */}
        <path
          d="M41 85C40 91 42 95 46 95C50 95 51 90 50 86"
          fill="#F4B748"
          stroke="#5A351E"
          strokeWidth="2.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M68 85C69 91 67 95 63 95C59 95 58 90 59 86"
          fill="#F4B748"
          stroke="#5A351E"
          strokeWidth="2.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Chubby Rounded Pencil Body */}
        <path
          d="M34 40C34 36 37 35 42 35H67C72 35 75 36 75 40L73 79C73 85 67 89 59 89H50C42 89 36 85 36 79L34 40Z"
          fill={`url(#${uid}-body)`}
          stroke="#5A351E"
          strokeWidth="2.9"
          strokeLinejoin="round"
        />

        {/* Soft Scalloped Wood Cone Collar + Chubby Tip */}
        <path
          d="M34 40L51 15C53 12 56 12 58 15L75 40C71 42 66 39 62 41C58 43 55 39 51 41C47 43 42 39 38 41C36 42 35 41 34 40Z"
          fill={`url(#${uid}-wood)`}
          stroke="#5A351E"
          strokeWidth="2.9"
          strokeLinejoin="round"
        />
        {/* Smooth Rounded Graphite Lead Tip */}
        <path
          d="M47 22C50 24 59 24 62 22L58 15C56 12 53 12 51 15L47 22Z"
          fill="#4A2D1A"
          stroke="#5A351E"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* Cute Specular Shine on Lead Tip */}
        <circle cx="52.5" cy="17.5" r="1.2" fill="#FFF7E8" opacity="0.8" />

        {/* Subtle Glossy Highlight Strip on Left Body */}
        <path
          d="M41 47V76"
          stroke="#FFF4CC"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Cute Backpack Strap Across Shoulder */}
        <path
          d="M68 44C71 54 71 66 67 76"
          stroke="#C45A15"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Soft Peach-Pink Kawaii Cheeks */}
        <ellipse cx="42" cy="60.5" rx="4.2" ry="2.5" fill="#F28C74" opacity="0.65" />
        <ellipse cx="67" cy="60.5" rx="4.2" ry="2.5" fill="#F28C74" opacity="0.65" />

        {/* Kawaii Mood Faces */}
        {mood === 'happy' && (
          <>
            {/* Big Glossy Left Eye */}
            <circle cx="46.5" cy="53" r="4.1" fill="#4A2D1A" />
            <circle cx="45.2" cy="51.3" r="1.6" fill="#FFFFFF" />
            <circle cx="48" cy="54.2" r="0.8" fill="#FFFFFF" />
            {/* Happy Wink Right Eye */}
            <path
              d="M59 53.5C61 50 65.5 50 67.5 53.5"
              stroke="#4A2D1A"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Sweet Open Smile + Little Tongue */}
            <path
              d="M49.5 60.5C50.5 66.5 58.5 66.5 59.5 60.5H49.5Z"
              fill="#C45A15"
              stroke="#4A2D1A"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M52 63.8C53.5 62.6 56 62.6 57.2 63.8"
              stroke="#FFB5A7"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Cute Sparkle Star */}
            <path
              d="M88 23L89.8 27.2L94 29L89.8 30.8L88 35L86.2 30.8L82 29L86.2 27.2L88 23Z"
              fill="#F5A623"
            />
            <circle cx="20" cy="24" r="2.2" fill="#E88B4B" opacity="0.7" />
          </>
        )}

        {mood === 'trying' && (
          <>
            {/* Cute Determined Brows */}
            <path d="M41.5 46.5L49 49" stroke="#4A2D1A" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M67.5 46.5L60 49" stroke="#4A2D1A" strokeWidth="2.4" strokeLinecap="round" />
            {/* Glossy Eyes */}
            <circle cx="46.5" cy="53.5" r="3.6" fill="#4A2D1A" />
            <circle cx="45.3" cy="52" r="1.4" fill="#FFFFFF" />
            <circle cx="62.5" cy="53.5" r="3.6" fill="#4A2D1A" />
            <circle cx="61.3" cy="52" r="1.4" fill="#FFFFFF" />
            {/* Cute Cat-Like Determined Smile */}
            <path
              d="M50.5 61.5C52 63.5 54 63.5 54.5 61.5C55 63.5 57 63.5 58.5 61.5"
              stroke="#4A2D1A"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M18 30L21 26M16 24L19 21" stroke="#C45A15" strokeWidth="2.2" strokeLinecap="round" />
          </>
        )}

        {mood === 'surprised' && (
          <>
            {/* Wide Kawaii Eyes */}
            <circle cx="46" cy="53" r="4.8" fill="#FFFFFF" stroke="#4A2D1A" strokeWidth="2.2" />
            <circle cx="46.3" cy="53.2" r="2.2" fill="#4A2D1A" />
            <circle cx="45.3" cy="52" r="0.9" fill="#FFFFFF" />
            <circle cx="63" cy="53" r="4.8" fill="#FFFFFF" stroke="#4A2D1A" strokeWidth="2.2" />
            <circle cx="62.7" cy="53.2" r="2.2" fill="#4A2D1A" />
            <circle cx="61.7" cy="52" r="0.9" fill="#FFFFFF" />
            {/* Cute Little O Mouth */}
            <ellipse
              cx="54.5"
              cy="63"
              rx="3.1"
              ry="3.8"
              fill="#E06D4E"
              stroke="#4A2D1A"
              strokeWidth="2"
            />
            {/* Playful Exclamation Marks */}
            <path d="M17 20V29M17 33.5V34.5" stroke="#C45A15" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M24 24V31M24 35V36" stroke="#E07D5A" strokeWidth="2.6" strokeLinecap="round" />
          </>
        )}

        {mood === 'relax' && (
          <>
            {/* Cozy Curved U Eyes */}
            <path
              d="M42.5 53.5C44.2 56.5 48.2 56.5 49.8 53.5"
              stroke="#4A2D1A"
              strokeWidth="2.7"
              strokeLinecap="round"
            />
            <path
              d="M59.2 53.5C60.8 56.5 64.8 56.5 66.5 53.5"
              stroke="#4A2D1A"
              strokeWidth="2.7"
              strokeLinecap="round"
            />
            {/* Gentle Content Smile */}
            <path
              d="M51.5 61.5C53.2 63.5 55.8 63.5 57.5 61.5"
              stroke="#4A2D1A"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
            {/* Cozy Zzz */}
            <path
              d="M81 21H89L81 29H89"
              stroke="#C45A15"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M91 14H96L91 19H96"
              stroke="#E07D5A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {mood === 'study' && (
          <>
            {/* Cute Round Study Glasses */}
            <circle cx="46.5" cy="53" r="6" fill="#FFFFFF" fillOpacity="0.35" stroke="#5A351E" strokeWidth="2" />
            <circle cx="62.5" cy="53" r="6" fill="#FFFFFF" fillOpacity="0.35" stroke="#5A351E" strokeWidth="2" />
            <path d="M52.5 53H56.5" stroke="#5A351E" strokeWidth="2" />
            {/* Sparkling Attentive Pupils */}
            <circle cx="46.5" cy="53" r="2.8" fill="#4A2D1A" />
            <circle cx="45.6" cy="51.8" r="1.1" fill="#FFFFFF" />
            <circle cx="62.5" cy="53" r="2.8" fill="#4A2D1A" />
            <circle cx="61.6" cy="51.8" r="1.1" fill="#FFFFFF" />
            {/* Sweet Focused Smile */}
            <path
              d="M50.5 61.5C52.5 64.2 56.5 64.2 58.5 61.5"
              stroke="#4A2D1A"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
            {/* Tiny Focus Star Sparkle */}
            <path
              d="M86 24L87.6 27.6L91.2 29.2L87.6 30.8L86 34.4L84.4 30.8L80.8 29.2L84.4 27.6L86 24Z"
              fill="#F5A623"
            />
          </>
        )}

        {mood === 'creative' && (
          <>
            {/* Sparkling Starry Eyes */}
            <circle cx="46.5" cy="53" r="4.3" fill="#4A2D1A" />
            <path
              d="M46.5 49.6L47.4 52L49.8 52.9L47.4 53.8L46.5 56.2L45.6 53.8L43.2 52.9L45.6 52L46.5 49.6Z"
              fill="#FFF8D8"
            />
            <circle cx="62.5" cy="53" r="4.3" fill="#4A2D1A" />
            <path
              d="M62.5 49.6L63.4 52L65.8 52.9L63.4 53.8L62.5 56.2L61.6 53.8L59.2 52.9L61.6 52L62.5 49.6Z"
              fill="#FFF8D8"
            />
            {/* Big Cheerful 'w' Smile */}
            <path
              d="M49.5 60.5C51 63.5 53.5 63.5 54.5 60.8C55.5 63.5 58 63.5 59.5 60.5"
              stroke="#4A2D1A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Cute Floating Music Note & Doodle Heart */}
            <path
              d="M83 22V14L89 12.5V20.5"
              stroke="#C45A15"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="81" cy="22.5" r="2.2" fill="#C45A15" />
            <circle cx="87" cy="21" r="2.2" fill="#C45A15" />
            <path
              d="M21 26C21 26 17 23.2 17 20.4C17 19 18.1 18 19.4 18C20.2 18 20.8 18.4 21 19C21.2 18.4 21.8 18 22.6 18C23.9 18 25 19 25 20.4C25 23.2 21 26 21 26Z"
              fill="#E07D5A"
            />
          </>
        )}
        </motion.g>
      </svg>
    </motion.div>
  );
};

export const FocusTreeIllustration: React.FC<{ level: number; className?: string }> = ({
  level,
  className = '',
}) => {
  const safeLevel = Math.max(1, Math.min(5, level));
  return (
    <div
      className={`w-full h-full bg-gradient-to-b from-[#FBF8F1] via-[#FDF3D0] to-[#F7E8BD] flex items-center justify-center p-6 relative overflow-hidden ${className}`}
    >
      <svg viewBox="0 0 280 260" className="w-full h-full max-h-[280px]" fill="none">
        {/* Soft Warm Paper Aura & Animated Sun */}
        <motion.circle
          cx="140"
          cy="112"
          r={54 + safeLevel * 8}
          fill="#FFFFFF"
          opacity="0.65"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="220"
          cy="48"
          r="16"
          fill="#F6D58E"
          animate={{ scale: [1, 1.12, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
        />

        {/* Desk Hill */}
        <ellipse cx="140" cy="232" rx="108" ry="18" fill="#EEDDB8" />

        {/* Kraft Terracotta Planter Pot */}
        <path
          d="M104 196H176L168 232H112L104 196Z"
          fill="#C45A15"
          stroke="#231E18"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <rect
          x="98"
          y="186"
          width="84"
          height="14"
          rx="6"
          fill="#DA742E"
          stroke="#231E18"
          strokeWidth="2.8"
        />

        {/* Gentle Breeze Swaying Tree Trunk, Canopy & Twinkling Star */}
        <motion.g
          style={{ transformOrigin: '140px 186px' }}
          animate={{ rotate: [-1.8, 1.8, -1.8] }}
          transition={{ repeat: Infinity, duration: 3.8, ease: 'easeInOut' }}
        >
          {/* Trunk */}
          <path
            d={
              safeLevel === 1
                ? 'M140 186V148'
                : safeLevel === 2
                  ? 'M140 186V128M140 156L122 142'
                  : 'M140 186C140 162 138 140 140 108M140 152L116 132M140 142L166 124'
            }
            stroke="#6A513B"
            strokeWidth={safeLevel >= 3 ? 10 : 7}
            strokeLinecap="round"
          />

          {/* Calm Sage-Botanical Canopy */}
          {safeLevel === 1 && (
            <>
              <path d="M140 150C122 144 114 130 124 122C134 116 142 132 140 150Z" fill="#5A8F73" stroke="#2D523F" strokeWidth="2.5" />
              <path d="M140 150C158 144 166 130 156 122C146 116 138 132 140 150Z" fill="#77AC8E" stroke="#2D523F" strokeWidth="2.5" />
            </>
          )}

          {safeLevel === 2 && (
            <>
              <circle cx="140" cy="116" r="28" fill="#5A8F73" stroke="#2D523F" strokeWidth="2.6" />
              <circle cx="118" cy="134" r="18" fill="#77AC8E" stroke="#2D523F" strokeWidth="2.4" />
              <circle cx="162" cy="134" r="16" fill="#77AC8E" stroke="#2D523F" strokeWidth="2.4" />
            </>
          )}

          {safeLevel >= 3 && (
            <>
              <circle cx="108" cy="120" r="30" fill="#46785E" stroke="#2D523F" strokeWidth="2.6" />
              <circle cx="172" cy="118" r="30" fill="#46785E" stroke="#2D523F" strokeWidth="2.6" />
              <circle cx="140" cy="92" r={safeLevel >= 4 ? 38 : 32} fill="#5A8F73" stroke="#2D523F" strokeWidth="2.6" />
              <circle cx="122" cy="108" r="24" fill="#77AC8E" />
              <circle cx="158" cy="106" r="22" fill="#77AC8E" />
            </>
          )}

          {safeLevel >= 3 && (
            <>
              <circle cx="116" cy="112" r="5.5" fill="#F2B84B" stroke="#C45A15" strokeWidth="2" />
              <circle cx="164" cy="106" r="5.5" fill="#F2B84B" stroke="#C45A15" strokeWidth="2" />
            </>
          )}
          {safeLevel >= 4 && (
            <>
              <circle cx="140" cy="76" r="6.5" fill="#FBE5B6" stroke="#C45A15" strokeWidth="2" />
              <circle cx="148" cy="122" r="5" fill="#E39036" />
            </>
          )}
          {safeLevel >= 5 && (
            <motion.path
              d="M140 34L144 43L154 44L147 51L149 61L140 56L131 61L133 51L126 44L136 43L140 34Z"
              fill="#F6D58E"
              stroke="#C45A15"
              strokeWidth="2.2"
              strokeLinejoin="round"
              style={{ transformOrigin: '140px 48px' }}
              animate={{ scale: [1, 1.18, 1], rotate: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            />
          )}
        </motion.g>
      </svg>
    </div>
  );
};

export const NhiphocRhythmMark: React.FC<{ dark?: boolean; className?: string }> = ({
  dark = false,
  className = '',
}) => {
  const strokeColor = dark ? '#E6B87D' : '#C45A15';
  const heartColor = dark ? '#F28C74' : '#D94E28';

  return (
    <span className={`inline-flex items-center shrink-0 ${className}`} aria-hidden="true">
      {/* Combined Beating Heart + Running Heartbeat Wave + Gliding Pencil Writing the Rhythm */}
      <svg
        viewBox="0 0 154 28"
        fill="none"
        className="h-6 w-auto shrink-0 overflow-visible"
      >
        {/* Soft Track of the Heartbeat */}
        <path
          d="M22 15H44L50 6L56 23L63 3L70 19L76 15H102L107 9L112 19L117 15H142"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.22"
        />

        {/* Animated Drawing Heartbeat Path */}
        <motion.path
          d="M22 15H44L50 6L56 23L63 3L70 19L76 15H102L107 9L112 19L117 15H142"
          stroke={strokeColor}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0.9 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0.95, 1, 0.35] }}
          transition={{
            repeat: Infinity,
            duration: 2.8,
            times: [0, 0.78, 1],
            ease: 'easeInOut',
          }}
        />

        {/* Beating Heart Anchor on the Left */}
        <g className="animate-heartbeat" style={{ transformOrigin: '13px 15px' }}>
          <path
            d="M13 23.5C13 23.5 4 17.6 4 11C4 7.8 6.5 5.5 9.2 5.5C10.9 5.5 12.3 6.4 13 7.8C13.7 6.4 15.1 5.5 16.8 5.5C19.5 5.5 22 7.8 22 11C22 17.6 13 23.5 13 23.5Z"
            fill={heartColor}
            stroke="#5A351E"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </g>

        {/* Cute Golden Pencil Gliding Along the Heartbeat Wave */}
        <motion.g
          animate={{
            x: [18, 46, 58, 70, 102, 136],
            y: [0, -3, 2, -4, 0, -2],
            rotate: [-6, 4, -8, 5, -4, 2],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.8,
            ease: 'easeInOut',
          }}
        >
          {/* Eraser Top */}
          <path
            d="M14.5 -3.8L18.8 0.5L16.9 2.4L12.6 -1.9L14.5 -3.8Z"
            fill="#E07D5A"
            stroke="#5A351E"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Golden Body */}
          <path
            d="M12.6 -1.9L16.9 2.4L7.4 11.9L3.1 7.6L12.6 -1.9Z"
            fill="#F8C65B"
            stroke="#5A351E"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Wood Cone & Graphite Tip */}
          <path
            d="M3.1 7.6L7.4 11.9L1.4 13.6L3.1 7.6Z"
            fill="#F5D3A8"
            stroke="#5A351E"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M2.1 10.9L4.2 13L1.4 13.6L2.1 10.9Z" fill="#4A2D1A" />
        </motion.g>

        {/* Tiny Sparkle Burst at End of Stroke */}
        <motion.path
          d="M147 6L148.3 9.2L151.5 10.5L148.3 11.8L147 15L145.7 11.8L142.5 10.5L145.7 9.2L147 6Z"
          fill="#F8C65B"
          stroke="#C45A15"
          strokeWidth="0.9"
          animate={{ scale: [0.5, 1.25, 0.5], opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          style={{ transformOrigin: '147px 10.5px' }}
        />
      </svg>
    </span>
  );
};

export const HeartbeatSlogan: React.FC<{
  dark?: boolean;
  className?: string;
  text?: string;
}> = ({ dark = false, className = '', text = 'Học nhịp nhàng, vững vàng tiến bước' }) => (
  <span className={`inline-flex items-center gap-2 flex-wrap ${className}`}>
    <NhiphocRhythmMark dark={dark} />
    <span className={`font-bold ${dark ? 'text-[#E6B87D]' : 'text-[#C45A15]'}`}>{text}</span>
  </span>
);

export const NhiphocAnimatedLogo: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  dark?: boolean;
  className?: string;
}> = ({ size = 'md', dark = false, className = '' }) => {
  const baseTextColor = dark ? '#F7F2E7' : '#231E18';
  const accentTextColor = dark ? '#E6B87D' : '#C45A15';

  const textSizeClass = {
    sm: 'text-2xl sm:text-3xl',
    md: 'text-3xl sm:text-4xl',
    lg: 'text-4xl sm:text-5xl',
  }[size];

  const starSizeClass = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
  }[size];

  return (
    <div
      className={`inline-flex items-center gap-2 select-none ${className}`}
      aria-label="Logo NhịpHọc"
    >
      {/* Big Twinkling Star Emblem Inserted Into Logo */}
      <NhiphocLogoMark className={`${starSizeClass} shrink-0`} />

      {/* Big Chubby Static "NhịpHọc" Wordmark + Accent Sparkle Star */}
      <span
        className={`relative inline-flex items-baseline font-logo leading-none ${textSizeClass}`}
      >
        <span style={{ color: baseTextColor }}>Nhịp</span>
        <span style={{ color: accentTextColor }}>Học</span>

        {/* Cute Golden Star Tucked Beside "NhịpHọc" */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5 self-start -mt-1 shrink-0"
          aria-hidden="true"
        >
          <path
            d="M12 2L14.4 8.6L21 10.2L15.6 14.5L17.4 21.2L12 17.5L6.6 21.2L8.4 14.5L3 10.2L9.6 8.6L12 2Z"
            fill="#F8C65B"
            stroke="#5A351E"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
};

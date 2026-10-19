const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="45%" stop-color="#1E1B4B" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>

    <!-- Top Highlight -->
    <linearGradient id="topHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.28" />
      <stop offset="30%" stop-color="#FFFFFF" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </linearGradient>

    <!-- Phone Body Gradient -->
    <linearGradient id="phoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="50%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>

    <!-- Phone Screen Gradient -->
    <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#090D16" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>

    <!-- Floating Window Gradient -->
    <linearGradient id="floatingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284C7" stop-opacity="0.88" />
      <stop offset="50%" stop-color="#2563EB" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#7C3AED" stop-opacity="0.92" />
    </linearGradient>

    <!-- Lens Ring Gradient -->
    <radialGradient id="lensRing" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="60%" stop-color="#0284C7" />
      <stop offset="90%" stop-color="#0369A1" />
      <stop offset="100%" stop-color="#0C4A6E" />
    </radialGradient>

    <!-- Wireless Waves Gradient -->
    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="50%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#C084FC" />
    </linearGradient>

    <!-- Glow Filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Heavy Drop Shadow -->
    <filter id="dropShadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="28" stdDeviation="32" flood-color="#000000" flood-opacity="0.55" />
    </filter>

    <!-- Floating Window Shadow -->
    <filter id="windowShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000000" flood-opacity="0.65" />
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#38BDF8" flood-opacity="0.35" />
    </filter>

    <!-- Squircle Clip for macOS Canvas -->
    <clipPath id="macSquircle">
      <path d="M 512,64
               C 748,64 896,112 940,244
               C 960,304 960,400 960,512
               C 960,624 960,720 940,780
               C 896,912 748,960 512,960
               C 276,960 128,912 84,780
               C 64,720 64,624 64,512
               C 64,400 64,304 84,244
               C 128,112 276,64 512,64 Z" />
    </clipPath>
  </defs>

  <!-- Shadow below macOS squircle -->
  <path d="M 512,68
           C 748,68 896,116 940,248
           C 960,308 960,404 960,516
           C 960,628 960,724 940,784
           C 896,916 748,964 512,964
           C 276,964 128,916 84,784
           C 64,724 64,628 64,516
           C 64,404 64,308 84,248
           C 128,116 276,68 512,68 Z"
        fill="#000000" opacity="0.4" filter="url(#dropShadow)" />

  <!-- Main Squircle Icon Body -->
  <g clip-path="url(#macSquircle)">
    <!-- Base Background -->
    <rect x="64" y="64" width="896" height="896" fill="url(#bgGrad)" />

    <!-- Ambient Glowing Nebulas -->
    <circle cx="340" cy="460" r="280" fill="#0284C7" opacity="0.22" filter="blur(60px)" />
    <circle cx="680" cy="580" r="260" fill="#7C3AED" opacity="0.25" filter="blur(60px)" />
    <circle cx="512" cy="300" r="180" fill="#38BDF8" opacity="0.18" filter="blur(50px)" />

    <!-- Subtle Diagonal Mesh Grid -->
    <g opacity="0.06" stroke="#FFFFFF" stroke-width="2">
      <line x1="100" y1="100" x2="900" y2="900" />
      <line x1="200" y1="100" x2="900" y2="800" />
      <line x1="300" y1="100" x2="900" y2="700" />
      <line x1="100" y1="200" x2="800" y2="900" />
      <line x1="100" y1="300" x2="700" y2="900" />
    </g>

    <!-- ================= SMARTPHONE (Base Left) ================= -->
    <g transform="translate(180, 240) rotate(-6, 170, 310)">
      <!-- Phone Shadow -->
      <rect x="10" y="18" width="310" height="560" rx="46" fill="#000000" opacity="0.45" filter="url(#dropShadow)" />
      <!-- Phone Outer Bezel -->
      <rect x="0" y="0" width="310" height="560" rx="46" fill="url(#phoneGrad)" stroke="#475569" stroke-width="4" />
      <!-- Phone Edge Inner Rim -->
      <rect x="6" y="6" width="298" height="548" rx="40" fill="none" stroke="#64748B" stroke-width="1.5" opacity="0.6" />
      <!-- Phone Screen -->
      <rect x="18" y="24" width="274" height="512" rx="30" fill="url(#screenGrad)" />

      <!-- Dynamic Island / Speaker notch -->
      <rect x="105" y="38" width="100" height="18" rx="9" fill="#020617" />
      <circle cx="178" cy="47" r="5" fill="#1E293B" />
      <circle cx="178" cy="47" r="2.5" fill="#0284C7" opacity="0.8" />

      <!-- Phone Camera Lens Unit (Prominent center in top half of screen) -->
      <circle cx="155" cy="210" r="76" fill="#0F172A" stroke="#334155" stroke-width="5" />
      <circle cx="155" cy="210" r="62" fill="url(#lensRing)" stroke="#38BDF8" stroke-width="2" />
      <circle cx="155" cy="210" r="42" fill="#030712" />
      <circle cx="155" cy="210" r="24" fill="#0284C7" opacity="0.75" />
      <circle cx="147" cy="202" r="8" fill="#FFFFFF" opacity="0.65" />
      <circle cx="163" cy="218" r="4" fill="#38BDF8" opacity="0.85" />

      <!-- Scanning Finder Brackets -->
      <path d="M 85 150 L 65 150 L 65 170" fill="none" stroke="#38BDF8" stroke-width="4" stroke-linecap="round" />
      <path d="M 225 150 L 245 150 L 245 170" fill="none" stroke="#38BDF8" stroke-width="4" stroke-linecap="round" />
      <path d="M 65 250 L 65 270 L 85 270" fill="none" stroke="#38BDF8" stroke-width="4" stroke-linecap="round" />
      <path d="M 245 250 L 245 270 L 225 270" fill="none" stroke="#38BDF8" stroke-width="4" stroke-linecap="round" />

      <!-- Home Indicator bar -->
      <rect x="110" y="516" width="90" height="5" rx="2.5" fill="#FFFFFF" opacity="0.4" />
    </g>

    <!-- ================= WIRELESS TRANSMISSION WAVES ================= -->
    <g transform="translate(480, 360)">
      <!-- Wave 1 (inner) -->
      <path d="M 10,70 A 55,55 0 0,1 60,10" fill="none" stroke="url(#waveGrad)" stroke-width="7" stroke-linecap="round" opacity="0.95" filter="url(#glow)" />
      <!-- Wave 2 (middle) -->
      <path d="M -5,115 A 110,110 0 0,1 115,-5" fill="none" stroke="url(#waveGrad)" stroke-width="8" stroke-linecap="round" opacity="0.85" filter="url(#glow)" />
      <!-- Wave 3 (outer) -->
      <path d="M -20,165 A 170,170 0 0,1 170,-20" fill="none" stroke="url(#waveGrad)" stroke-width="9" stroke-linecap="round" opacity="0.65" />
    </g>

    <!-- ================= FLOATING PREVIEW WINDOW (Top Right) ================= -->
    <g transform="translate(490, 220)" filter="url(#windowShadow)">
      <!-- Outer Glassmorphic Container -->
      <rect x="0" y="0" width="370" height="270" rx="36" fill="url(#floatingGrad)" stroke="#38BDF8" stroke-width="4" />
      <!-- Glass Inner Highlight -->
      <rect x="4" y="4" width="362" height="262" rx="32" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.45" />

      <!-- Video Feed Screen Window -->
      <rect x="16" y="16" width="338" height="238" rx="24" fill="#0B132B" opacity="0.85" />

      <!-- Mini Live Video Indicator inside preview -->
      <g transform="translate(36, 36)">
        <circle cx="10" cy="10" r="7" fill="#EF4444" />
        <circle cx="10" cy="10" r="14" fill="#EF4444" opacity="0.35" filter="url(#glow)" />
        <text x="32" y="15" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" font-size="16" font-weight="700" letter-spacing="1">LIVE</text>
      </g>

      <!-- Video Target Reticle / Avatar representation -->
      <circle cx="185" cy="135" r="54" fill="#1E293B" stroke="#38BDF8" stroke-width="3" stroke-dasharray="8 6" />
      <!-- Inner webcam silhouette / aperture -->
      <circle cx="185" cy="135" r="34" fill="#0284C7" opacity="0.8" />
      <circle cx="185" cy="135" r="16" fill="#38BDF8" />
      <circle cx="178" cy="128" r="5" fill="#FFFFFF" opacity="0.9" />

      <!-- Bottom Mini Floating Dock / Window Bar inside the floating window -->
      <g transform="translate(95, 218)">
        <rect x="0" y="0" width="180" height="24" rx="12" fill="#0F172A" opacity="0.75" stroke="#38BDF8" stroke-width="1.5" />
        <circle cx="36" cy="12" r="5" fill="#38BDF8" />
        <circle cx="90" cy="12" r="5" fill="#818CF8" />
        <circle cx="144" cy="12" r="5" fill="#C084FC" />
      </g>
    </g>

    <!-- Top Edge Highlight Sheen -->
    <rect x="64" y="64" width="896" height="400" fill="url(#topHighlight)" pointer-events="none" />

    <!-- Crisp Border Stroke -->
    <path d="M 512,64
             C 748,64 896,112 940,244
             C 960,304 960,400 960,512
             C 960,624 960,720 940,780
             C 896,912 748,960 512,960
             C 276,960 128,912 84,780
             C 64,720 64,624 64,512
             C 64,400 64,304 84,244
             C 128,112 276,64 512,64 Z"
          fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.32" />
  </g>
</svg>`;

const templateSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" width="22" height="22">
  <!-- Minimalist menu-bar camera icon with floating indicator -->
  <!-- Camera body -->
  <path d="M 4 7 C 2.9 7 2 7.9 2 9 L 2 17 C 2 18.1 2.9 19 4 19 L 18 19 C 19.1 19 20 18.1 20 17 L 20 9 C 20 7.9 19.1 7 18 7 L 15.5 7 L 14.5 5 L 7.5 5 L 6.5 7 Z" fill="#000000" />
  <!-- Lens cutout -->
  <circle cx="11" cy="13" r="3.6" fill="none" stroke="#FFFFFF" stroke-width="1.8" />
  <circle cx="11" cy="13" r="1.4" fill="#FFFFFF" />
  <!-- Top wireless signal arc -->
  <path d="M 8.5 2.5 A 3.5 3.5 0 0 1 13.5 2.5" fill="none" stroke="#000000" stroke-width="1.6" stroke-linecap="round" />
</svg>`;

const ROOT_DIR = path.resolve(__dirname, '..');
fs.writeFileSync(path.join(ROOT_DIR, 'assets', 'icon-master.svg'), svgContent);
fs.writeFileSync(path.join(ROOT_DIR, 'assets', 'iconTemplate.svg'), templateSvg);
console.log('Saved icon-master.svg and iconTemplate.svg');

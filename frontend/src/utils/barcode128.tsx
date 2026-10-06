/**
 * Code 128 (Subset B) Standard Barcode Generator
 * Generates standards-compliant scannable barcodes for physical 1D/2D laser and camera scanners
 */
import React from 'react';

// Standard Code 128 Patterns (widths of: bar, space, bar, space, bar, space)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (106 is STOP)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Encodes ASCII string into Code 128 binary modules string (1 = bar, 0 = space)
 */
export function encodeCode128(text: string): string {
  if (!text) return '';

  const clean = text.trim();
  const indices: number[] = [START_CODE_B];
  let checksum = START_CODE_B;

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    // Code 128 Set B covers ASCII 32 to 126
    const codeIndex = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0;
    indices.push(codeIndex);
    checksum += codeIndex * (i + 1);
  }

  const checksumIndex = checksum % 103;
  indices.push(checksumIndex);
  indices.push(STOP_CODE);

  // Convert pattern widths to 1s and 0s
  let binary = '';
  // Quiet zone at start (10 modules space)
  binary += '0000000000';

  indices.forEach((patternIdx) => {
    const pattern = CODE128_PATTERNS[patternIdx] || CODE128_PATTERNS[0];
    let isBar = true;
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10);
      binary += (isBar ? '1' : '0').repeat(width);
      isBar = !isBar;
    }
  });

  // Quiet zone at end (10 modules space)
  binary += '0000000000';

  return binary;
}

/**
 * Plays physical feedback audio beep when a barcode is scanned
 */
export function playScannerBeep(success = true) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      // Crisp 1350Hz scanner chime (high pitch, short duration)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1350, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else {
      // 280Hz low rejection buzzer
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    }
  } catch (e) {
    // Audio context was not allowed or failed
  }
}

export interface BarcodeProps {
  value: string;
  height?: number;
  barWidth?: number;
  className?: string;
  showText?: boolean;
}

export const BarcodeSvg: React.FC<BarcodeProps> = ({
  value,
  height = 54,
  barWidth = 1.6,
  className = '',
  showText = true
}) => {
  const binary = encodeCode128(value);
  if (!binary) return null;

  const totalWidth = binary.length * barWidth;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        width="100%"
        height={height}
        className="overflow-visible block"
        style={{ shapeRendering: 'crispEdges' }}
      >
        <rect width={totalWidth} height={height} fill="#ffffff" />
        {binary.split('').map((bit, idx) => {
          if (bit === '1') {
            return (
              <rect
                key={idx}
                x={idx * barWidth}
                y={0}
                width={barWidth}
                height={height}
                fill="#000000"
              />
            );
          }
          return null;
        })}
      </svg>
      {showText && (
        <span className="font-mono text-xs font-black tracking-widest text-slate-900 mt-1 block">
          *{value}*
        </span>
      )}
    </div>
  );
};

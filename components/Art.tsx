// Illustrasjoner for Okei: maskoten «Erta», dyreavatarer, skannemodus-fliser og mat-klistremerker.
// Alt er egne, enkle SVG-er slik at de skalerer skarpt og laster uten nettverk.

const OUT = '#0B4F40'
const DARK = '#0B2B23'
const BODY = '#3DB47A'

export type Mood = 'happy' | 'unsure' | 'stop' | 'wave'

export function Mascot({ mood = 'wave', size = 120, title }: { mood?: Mood; size?: number; title?: string }) {
  const arm = { className: 'mo', fill: 'none', stroke: OUT, strokeWidth: 3.2, strokeLinecap: 'round' as const }
  const hand = { className: 'mb mo', fill: BODY, stroke: OUT, strokeWidth: 2.6 }
  return (
    <svg className="mascot" width={size} height={size} viewBox="0 0 120 120" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {/* armer bak kroppen */}
      {mood === 'happy' && (
        <>
          <path d="M28 66 Q16 54 17 40" {...arm} />
          <path d="M92 66 Q104 54 103 40" {...arm} />
          <circle cx="17" cy="38" r="5.5" {...hand} />
          <circle cx="103" cy="38" r="5.5" {...hand} />
        </>
      )}
      {mood === 'wave' && (
        <>
          <path d="M24 76 Q14 84 16 94" {...arm} />
          <circle cx="16" cy="96" r="5.5" {...hand} />
          <path d="M94 64 Q108 56 107 42" {...arm} />
          <circle cx="107" cy="40" r="5.5" {...hand} />
          <path className="mo" d="M114 30 q4 6 2 12 M118 24 q6 9 3 19" fill="none" stroke={OUT} strokeWidth="2" strokeLinecap="round" opacity=".55" />
        </>
      )}
      {mood === 'unsure' && (
        <>
          <path d="M24 76 Q14 84 16 94" {...arm} />
          <circle cx="16" cy="96" r="5.5" {...hand} />
          <path d="M95 74 Q108 70 106 58" {...arm} />
          <line className="mo" x1="104" y1="52" x2="106" y2="60" stroke={OUT} strokeWidth="4" strokeLinecap="round" />
          <circle className="mo" cx="102" cy="41" r="11" fill="#E4F3FB" fillOpacity=".85" stroke={OUT} strokeWidth="3" />
          <path d="M96 37 q3 -4 7 -4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="106" cy="60" r="5" {...hand} />
        </>
      )}
      {mood === 'stop' && (
        <>
          <path d="M24 76 Q14 84 16 94" {...arm} />
          <circle cx="16" cy="96" r="5.5" {...hand} />
          <path d="M94 70 Q104 66 104 56" {...arm} />
          <rect className="mo" x="93" y="32" width="22" height="26" rx="10" fill="#fff" stroke={OUT} strokeWidth="3" />
          <path className="mo" d="M99 36v8 M104 34v10 M109 36v8" stroke={OUT} strokeWidth="2" strokeLinecap="round" opacity=".5" />
        </>
      )}

      {/* føtter */}
      <ellipse className="mf mo" cx="47" cy="105" rx="10" ry="5.5" fill="#2A8F5E" stroke={OUT} strokeWidth="2.6" />
      <ellipse className="mf mo" cx="73" cy="105" rx="10" ry="5.5" fill="#2A8F5E" stroke={OUT} strokeWidth="2.6" />

      {/* spire */}
      <path className="mo" d="M60 31 C60 23 62 17 66 13" fill="none" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
      <path className="ml mo" d="M66 14 C72 5 83 7 86 10 C81 19 72 21 66 14Z" fill="#8FDCA6" stroke={OUT} strokeWidth="2.6" strokeLinejoin="round" />

      {/* kropp */}
      <ellipse className="mb mo" cx="60" cy="68" rx="40" ry="38" fill={BODY} stroke={OUT} strokeWidth="3.2" />
      <ellipse cx="44" cy="50" rx="11" ry="6" fill="#fff" opacity=".28" transform="rotate(-28 44 50)" />

      {/* øyne */}
      {mood === 'happy' ? (
        <>
          <path d="M40 63 q7 -9 14 0" fill="none" stroke={DARK} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M66 63 q7 -9 14 0" fill="none" stroke={DARK} strokeWidth="3.4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse className="mo" cx="47" cy="62" rx="8" ry="9.5" fill="#fff" stroke={OUT} strokeWidth="2.4" />
          <ellipse className="mo" cx="73" cy="62" rx="8" ry="9.5" fill="#fff" stroke={OUT} strokeWidth="2.4" />
          <circle cx={mood === 'unsure' ? 50 : 48} cy={mood === 'unsure' ? 61 : 64} r="4.2" fill={DARK} />
          <circle cx={mood === 'unsure' ? 76 : 74} cy={mood === 'unsure' ? 61 : 64} r="4.2" fill={DARK} />
          <circle cx={mood === 'unsure' ? 51.5 : 49.5} cy={mood === 'unsure' ? 59.5 : 62.5} r="1.4" fill="#fff" />
          <circle cx={mood === 'unsure' ? 77.5 : 75.5} cy={mood === 'unsure' ? 59.5 : 62.5} r="1.4" fill="#fff" />
        </>
      )}

      {/* bryn */}
      {mood === 'unsure' && (
        <>
          <path d="M40 49 L53 50" stroke={DARK} strokeWidth="3" strokeLinecap="round" />
          <path d="M67 47 L80 42" stroke={DARK} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {mood === 'stop' && (
        <>
          <path d="M40 51 L53 47" stroke={DARK} strokeWidth="3" strokeLinecap="round" />
          <path d="M67 47 L80 51" stroke={DARK} strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      {/* kinn */}
      <ellipse cx="37" cy="77" rx="5.5" ry="3.2" fill="#FF8FA3" opacity=".75" />
      <ellipse cx="83" cy="77" rx="5.5" ry="3.2" fill="#FF8FA3" opacity=".75" />

      {/* munn */}
      {mood === 'happy' && (
        <>
          <path d="M49 77 Q60 93 71 77 Z" fill={DARK} stroke={DARK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M54 84 Q60 89 66 84 Q60 81 54 84Z" fill="#FF6B81" />
        </>
      )}
      {mood === 'wave' && <path d="M51 79 Q60 88 69 79" fill="none" stroke={DARK} strokeWidth="3.2" strokeLinecap="round" />}
      {mood === 'unsure' && <path d="M50 83 q5 -4 10 0 t10 0" fill="none" stroke={DARK} strokeWidth="3" strokeLinecap="round" />}
      {mood === 'stop' && <ellipse cx="60" cy="83" rx="4.5" ry="5.5" fill={DARK} />}

      {/* gnister */}
      {mood === 'happy' && (
        <>
          <Sparkle x={10} y={18} s={1} />
          <Sparkle x={108} y={14} s={0.8} />
          <Sparkle x={112} y={70} s={0.6} />
        </>
      )}
    </svg>
  )
}

function Sparkle({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -8 Q1.5 -1.5 8 0 Q1.5 1.5 0 8 Q-1.5 1.5 -8 0 Q-1.5 -1.5 0 -8Z"
      fill="#FFC845"
      stroke={OUT}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  )
}

/* ---------- Dyreavatarer ---------- */

export const ANIMALS = [
  { id: 'bear', label: 'Bjørn' },
  { id: 'fox', label: 'Rev' },
  { id: 'cat', label: 'Katt' },
  { id: 'rabbit', label: 'Kanin' },
  { id: 'owl', label: 'Ugle' },
  { id: 'penguin', label: 'Pingvin' },
  { id: 'frog', label: 'Frosk' },
  { id: 'lion', label: 'Løve' }
] as const

export type AnimalId = (typeof ANIMALS)[number]['id']

export function animalFor(avatar: string | null | undefined, index: number): AnimalId {
  if (avatar && ANIMALS.some((a) => a.id === avatar)) return avatar as AnimalId
  return ANIMALS[index % ANIMALS.length].id
}

const AN_BG: Record<AnimalId, string> = {
  bear: '#F7DCCB',
  fox: '#FFE6C7',
  cat: '#E9DDF4',
  rabbit: '#DDEFDF',
  owl: '#D8E7F7',
  penguin: '#CFEAF8',
  frog: '#E6F6CD',
  lion: '#FFF0B8'
}

function Eyes({ y = 24, dx = 5.5, r = 1.9 }: { y?: number; dx?: number; r?: number }) {
  return (
    <>
      <circle cx={24 - dx} cy={y} r={r} fill={DARK} />
      <circle cx={24 + dx} cy={y} r={r} fill={DARK} />
    </>
  )
}

export function Animal({ id, size = 40 }: { id: AnimalId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <circle cx="24" cy="24" r="24" fill={AN_BG[id]} />
      {id === 'bear' && (
        <>
          <circle cx="13.5" cy="15" r="5.5" fill="#8B5A3C" />
          <circle cx="34.5" cy="15" r="5.5" fill="#8B5A3C" />
          <circle cx="13.5" cy="15" r="2.6" fill="#E8B993" />
          <circle cx="34.5" cy="15" r="2.6" fill="#E8B993" />
          <circle cx="24" cy="27" r="13.5" fill="#A86B45" />
          <ellipse cx="24" cy="32" rx="7" ry="5.2" fill="#EBC7A3" />
          <ellipse cx="24" cy="29.6" rx="2.6" ry="1.9" fill={DARK} />
          <Eyes y={23.5} />
        </>
      )}
      {id === 'fox' && (
        <>
          <path d="M9 15 L16 6 L22 17 L26 17 L32 6 L39 15 L37 29 Q24 43 11 29 Z" fill="#E8743B" />
          <path d="M14 13 L16.5 9.5 L19 15Z M34 13 L31.5 9.5 L29 15Z" fill="#7A3414" />
          <path d="M11 27 Q18 29 24 37 Q30 29 37 27 Q33 40 24 41 Q15 40 11 27Z" fill="#fff" />
          <circle cx="24" cy="37" r="2.1" fill={DARK} />
          <Eyes y={24} dx={6} />
        </>
      )}
      {id === 'cat' && (
        <>
          <path d="M11 22 L13 8 L22 15Z M37 22 L35 8 L26 15Z" fill="#8E8A99" />
          <path d="M14 18 L14.8 11.5 L19 15Z M34 18 L33.2 11.5 L29 15Z" fill="#F4A6B8" />
          <circle cx="24" cy="27" r="13" fill="#A19DAC" />
          <path d="M22.2 29 h3.6 L24 31.2Z" fill="#F07C98" />
          <path d="M8 28 h8 M8 32 l8 -1.5 M40 28 h-8 M40 32 l-8 -1.5" stroke="#5B5866" strokeWidth="1.2" strokeLinecap="round" />
          <Eyes y={24.5} />
        </>
      )}
      {id === 'rabbit' && (
        <>
          <ellipse cx="18" cy="12" rx="3.8" ry="9.5" fill="#fff" stroke="#CFCFCF" strokeWidth="1" />
          <ellipse cx="30" cy="12" rx="3.8" ry="9.5" fill="#fff" stroke="#CFCFCF" strokeWidth="1" />
          <ellipse cx="18" cy="12" rx="1.6" ry="6.5" fill="#F4A6B8" />
          <ellipse cx="30" cy="12" rx="1.6" ry="6.5" fill="#F4A6B8" />
          <circle cx="24" cy="30" r="12" fill="#fff" stroke="#CFCFCF" strokeWidth="1" />
          <ellipse cx="24" cy="32" rx="2" ry="1.5" fill="#F07C98" />
          <circle cx="16" cy="33" r="2.2" fill="#FFC2CF" opacity=".8" />
          <circle cx="32" cy="33" r="2.2" fill="#FFC2CF" opacity=".8" />
          <Eyes y={28} dx={5} />
        </>
      )}
      {id === 'owl' && (
        <>
          <path d="M11 13 L16 18 L12 21Z M37 13 L32 18 L36 21Z" fill="#7A5A3C" />
          <circle cx="24" cy="27" r="14" fill="#9A7552" />
          <circle cx="18" cy="25" r="5.8" fill="#fff" />
          <circle cx="30" cy="25" r="5.8" fill="#fff" />
          <circle cx="18" cy="25" r="2.7" fill={DARK} />
          <circle cx="30" cy="25" r="2.7" fill={DARK} />
          <path d="M21.5 30 h5 L24 34Z" fill="#F2A23A" />
          <path d="M16 36 q2 2 4 0 q2 2 4 0 q2 2 4 0 q2 2 4 0" fill="none" stroke="#6E5038" strokeWidth="1.2" />
        </>
      )}
      {id === 'penguin' && (
        <>
          <circle cx="24" cy="27" r="14" fill="#23303D" />
          <path d="M24 17 Q14 17 14 28 Q14 38 24 38 Q34 38 34 28 Q34 17 24 17Z" fill="#fff" />
          <path d="M24 17 Q20 22 24 25 Q28 22 24 17Z" fill="#23303D" />
          <path d="M20.5 29 h7 L24 33Z" fill="#F2A23A" />
          <Eyes y={26} dx={5} />
        </>
      )}
      {id === 'frog' && (
        <>
          <circle cx="15.5" cy="16" r="6.5" fill="#5DBB4A" />
          <circle cx="32.5" cy="16" r="6.5" fill="#5DBB4A" />
          <ellipse cx="24" cy="29" rx="15" ry="11" fill="#5DBB4A" />
          <circle cx="15.5" cy="16" r="3.6" fill="#fff" />
          <circle cx="32.5" cy="16" r="3.6" fill="#fff" />
          <circle cx="16" cy="16.5" r="1.8" fill={DARK} />
          <circle cx="33" cy="16.5" r="1.8" fill={DARK} />
          <path d="M16 30 Q24 36 32 30" fill="none" stroke={DARK} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="13" cy="28" r="2" fill="#FF9DB0" opacity=".7" />
          <circle cx="35" cy="28" r="2" fill="#FF9DB0" opacity=".7" />
        </>
      )}
      {id === 'lion' && (
        <>
          <circle cx="24" cy="25" r="16" fill="#D98A2B" />
          <circle cx="24" cy="26" r="10.5" fill="#F5C15C" />
          <ellipse cx="24" cy="30" rx="5" ry="3.6" fill="#FBE0A6" />
          <path d="M22 28 h4 L24 30Z" fill="#7A3A12" />
          <Eyes y={23.5} dx={4.6} />
        </>
      )}
    </svg>
  )
}

/* ---------- Skannemodus-fliser ---------- */

export function ModeArt({ mode, size = 56 }: { mode: 'barcode' | 'label' | 'food' | 'menu' | 'product'; size?: number }) {
  if (mode === 'menu')
    return (
      <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
        <rect x="12" y="8" width="26" height="40" rx="3" fill="#fff" stroke={OUT} strokeWidth="2.4" />
        <path d="M17 17 h16 M17 24 h12 M17 31 h16 M17 38 h10" stroke="#9AA7A0" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M44 10 v14 a3 3 0 0 1 -6 0 v-14 M41 10 v36" fill="none" stroke={OUT} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    )
  if (mode === 'product')
    return (
      <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
        <rect x="10" y="20" width="18" height="28" rx="4" fill="#fff" stroke={OUT} strokeWidth="2.4" />
        <rect x="13" y="13" width="12" height="8" rx="2" fill="#9ED3B4" stroke={OUT} strokeWidth="2.4" />
        <path d="M14 30 h10 M14 36 h7" stroke="#9AA7A0" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M34 22 h12 l-2 26 h-8 z" fill="#FFD7E4" stroke={OUT} strokeWidth="2.4" strokeLinejoin="round" />
        <rect x="36" y="14" width="8" height="8" rx="2" fill="#fff" stroke={OUT} strokeWidth="2.4" />
      </svg>
    )
  if (mode === 'barcode')
    return (
      <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
        <path d="M10 18 L28 10 L46 18 L46 40 L28 48 L10 40Z" fill="#FFD27A" stroke={OUT} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M10 18 L28 26 L46 18 M28 26 V48" fill="none" stroke={OUT} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M28 26 L46 18 L46 40 L28 48Z" fill="#F0B64E" stroke={OUT} strokeWidth="2.4" strokeLinejoin="round" />
        <rect x="14" y="27" width="11" height="12" rx="1.5" fill="#fff" transform="skewY(24) translate(0 -9)" />
        <g fill={DARK} transform="skewY(24) translate(0 -9)">
          <rect x="15.5" y="29" width="1.2" height="8" /><rect x="17.6" y="29" width="0.7" height="8" /><rect x="19.2" y="29" width="1.6" height="8" /><rect x="21.6" y="29" width="0.7" height="8" /><rect x="23" y="29" width="1" height="8" />
        </g>
      </svg>
    )
  if (mode === 'label')
    return (
      <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
        <path d="M12 8 h24 l8 8 v32 h-32Z" fill="#fff" stroke={OUT} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M36 8 v8 h8" fill="none" stroke={OUT} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M17 20 h16 M17 26 h20 M17 32 h12" stroke="#9AA7A0" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="36" cy="36" r="8" fill="#E4F3FB" stroke={OUT} strokeWidth="2.6" />
        <path d="M42 42 l6 6" stroke={OUT} strokeWidth="3.4" strokeLinecap="round" />
      </svg>
    )
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
      <ellipse cx="28" cy="42" rx="22" ry="7" fill="#fff" stroke={OUT} strokeWidth="2.4" />
      <path d="M12 39 Q12 20 28 18 Q44 20 44 39Z" fill="#E7A25A" stroke={OUT} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M18 30 q4 -4 8 0 M30 26 q4 -4 8 0" fill="none" stroke="#B26A28" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="23" r="1.2" fill="#FFF3D6" /><circle cx="31" cy="21" r="1.2" fill="#FFF3D6" /><circle cx="36" cy="31" r="1.2" fill="#FFF3D6" />
    </svg>
  )
}

/* ---------- Mat-klistremerker (innlogging) ---------- */

export type Food = 'apple' | 'carrot' | 'milk' | 'egg' | 'bread' | 'fish'

export function FoodSticker({ kind, size = 44 }: { kind: Food; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      {kind === 'apple' && (
        <>
          <path d="M22 13 C14 8 6 14 8 25 C10 35 17 39 22 36 C27 39 34 35 36 25 C38 14 30 8 22 13Z" fill="#F0554B" stroke={OUT} strokeWidth="2.2" />
          <path d="M22 13 C22 9 23 6 25 4" fill="none" stroke={OUT} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M24 8 C28 3 33 5 34 6 C31 10 27 11 24 8Z" fill="#8FDCA6" stroke={OUT} strokeWidth="1.8" />
          <ellipse cx="15" cy="19" rx="3" ry="1.8" fill="#fff" opacity=".45" transform="rotate(-35 15 19)" />
        </>
      )}
      {kind === 'carrot' && (
        <>
          <path d="M30 10 L8 36 Q6 38 9 37 L35 16Z" fill="#F28C28" stroke={OUT} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M31 13 Q33 4 38 4 M33 14 Q42 12 41 8 M32 12 Q30 6 33 3" fill="none" stroke="#2A8F5E" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M17 26 l4 3 M22 20 l3 2" stroke={OUT} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {kind === 'milk' && (
        <>
          <path d="M12 16 L16 8 H28 L32 16 V38 H12Z" fill="#fff" stroke={OUT} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M12 16 H32" stroke={OUT} strokeWidth="2.2" />
          <rect x="12" y="22" width="20" height="10" fill="#7DB8E8" />
          <path d="M19 27 q3 -3 6 0" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
      {kind === 'egg' && (
        <>
          <path d="M22 6 C13 6 9 20 9 27 C9 35 15 39 22 39 C29 39 35 35 35 27 C35 20 31 6 22 6Z" fill="#FFF7E8" stroke={OUT} strokeWidth="2.2" />
          <ellipse cx="16" cy="18" rx="2.2" ry="4" fill="#fff" transform="rotate(20 16 18)" />
        </>
      )}
      {kind === 'bread' && (
        <>
          <path d="M8 20 C6 10 16 7 22 9 C28 7 38 10 36 20 C35 22 34 22 33 22 V37 H11 V22 C10 22 9 22 8 20Z" fill="#E7A25A" stroke={OUT} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M14 21 C13 15 18 13 22 14 C26 13 31 15 30 21 V33 H14Z" fill="#FFE2B3" />
        </>
      )}
      {kind === 'fish' && (
        <>
          <path d="M6 22 C12 12 26 12 33 22 C26 32 12 32 6 22Z" fill="#7DB8E8" stroke={OUT} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M32 22 L40 15 V29Z" fill="#7DB8E8" stroke={OUT} strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="13" cy="20.5" r="1.8" fill={DARK} />
          <path d="M20 17 q3 5 0 10" fill="none" stroke={OUT} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

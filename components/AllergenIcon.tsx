// Symboler for allergener og tilstander. Emoji der de er entydige, egne SVG der emoji er misvisende
// (🌾 er risaks, 🌰 er kastanje, 🍷 er upassende for barn).

import type { AllergenKey, ConditionKey } from '@/lib/allergens'

type Key = AllergenKey | ConditionKey | 'lactose'

const EMOJI: Partial<Record<Key, string>> = {
  milk: '🥛',
  egg: '🥚',
  peanut: '🥜',
  fish: '🐟',
  crustaceans: '🦐',
  molluscs: '🦪'
}

function Svg({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flex: 'none' }}>
      {children}
    </svg>
  )
}

const Wheat = ({ size }: { size: number }) => (
  <Svg size={size}>
    <path d="M16 29V9" stroke="#8A6A1F" strokeWidth="2" strokeLinecap="round" />
    {[10, 15, 20].map((y) => (
      <g key={y}>
        <ellipse cx="12.2" cy={y} rx="3.2" ry="2" transform={`rotate(-35 12.2 ${y})`} fill="#E3B341" />
        <ellipse cx="19.8" cy={y} rx="3.2" ry="2" transform={`rotate(35 19.8 ${y})`} fill="#E3B341" />
      </g>
    ))}
    <ellipse cx="16" cy="5.5" rx="2" ry="3.2" fill="#E3B341" />
  </Svg>
)

const Badge = ({ letter }: { letter: string }) => (
  <g>
    <circle cx="25" cy="25" r="6" fill="#15201B" />
    <text x="25" y="28.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">{letter}</text>
  </g>
)

export default function AllergenIcon({ k, size = 28 }: { k: Key | string; size?: number }) {
  const key = k as Key
  if (key === 'lactose') {
    return (
      <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, alignItems: 'center', justifyContent: 'center', fontSize: size * 0.8, lineHeight: 1 }} aria-hidden="true">
        🥛
        <svg width={size} height={size} viewBox="0 0 32 32" style={{ position: 'absolute', inset: 0 }}><Badge letter="L" /></svg>
      </span>
    )
  }
  if (EMOJI[key]) {
    return (
      <span aria-hidden="true" style={{ fontSize: size * 0.8, lineHeight: 1, width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        {EMOJI[key]}
      </span>
    )
  }
  switch (key) {
    case 'gluten':
      return <Wheat size={size} />
    case 'coeliac':
      return (
        <Svg size={size}>
          <path d="M16 29V9" stroke="#8A6A1F" strokeWidth="2" strokeLinecap="round" />
          {[10, 15, 20].map((y) => (
            <g key={y}>
              <ellipse cx="12.2" cy={y} rx="3.2" ry="2" transform={`rotate(-35 12.2 ${y})`} fill="#E3B341" />
              <ellipse cx="19.8" cy={y} rx="3.2" ry="2" transform={`rotate(35 19.8 ${y})`} fill="#E3B341" />
            </g>
          ))}
          <Badge letter="C" />
        </Svg>
      )
    case 'nuts':
      return (
        <Svg size={size}>
          <path d="M8 13c0-4 3.6-7 8-7s8 3 8 7z" fill="#7A4A1F" />
          <path d="M16 6v-3" stroke="#7A4A1F" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 13h14c0 7-3 13-7 13s-7-6-7-13z" fill="#C98A4B" />
        </Svg>
      )
    case 'soy':
      return (
        <Svg size={size}>
          <path d="M5 22c4-12 14-17 23-15-2 10-11 18-23 15z" fill="#7FAE3E" />
          <circle cx="12" cy="18" r="2.6" fill="#D6E9A8" />
          <circle cx="17.5" cy="14.5" r="2.6" fill="#D6E9A8" />
          <circle cx="23" cy="11" r="2.6" fill="#D6E9A8" />
        </Svg>
      )
    case 'sesame':
      return (
        <Svg size={size}>
          {[[11, 12, -20], [20, 10, 25], [15, 21, 5]].map(([x, y, r]) => (
            <path key={`${x}-${y}`} d={`M${x} ${y - 5}c3 2 3 8 0 10c-3-2-3-8 0-10z`} transform={`rotate(${r} ${x} ${y})`} fill="#E8D3A2" stroke="#A8864A" strokeWidth="1" />
          ))}
        </Svg>
      )
    case 'celery':
      return (
        <Svg size={size}>
          <path d="M11 29l1-16M16 29V12M21 29l-1-16" stroke="#6BA34A" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="11" cy="9" r="3.5" fill="#3E7D2A" />
          <circle cx="16" cy="6.5" r="3.5" fill="#3E7D2A" />
          <circle cx="21" cy="9" r="3.5" fill="#3E7D2A" />
        </Svg>
      )
    case 'mustard':
      return (
        <Svg size={size}>
          <path d="M10 10h12l-1 17a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2z" fill="#F2C230" stroke="#B8901A" strokeWidth="1.2" />
          <path d="M13 10V6h6v4" fill="#F2C230" stroke="#B8901A" strokeWidth="1.2" />
          <path d="M15 6V3h2v3" fill="#B8901A" />
        </Svg>
      )
    case 'sulphites':
      return (
        <Svg size={size}>
          <circle cx="16" cy="16" r="13" fill="#E9E4F5" stroke="#6B5BA8" strokeWidth="2" />
          <text x="16" y="20" textAnchor="middle" fontSize="10" fontWeight="800" fill="#4B3D8A" fontFamily="system-ui, sans-serif">SO₂</text>
        </Svg>
      )
    case 'lupin':
      return (
        <Svg size={size}>
          <path d="M16 30V20" stroke="#4E8A3A" strokeWidth="2" strokeLinecap="round" />
          {[6, 9.5, 13, 16.5].map((y, i) => (
            <g key={y}>
              <ellipse cx={13.5 + i * 0.3} cy={y} rx="2.4" ry="1.8" fill="#8A6BD1" />
              <ellipse cx={18.5 - i * 0.3} cy={y} rx="2.4" ry="1.8" fill="#A98BE6" />
            </g>
          ))}
          <ellipse cx="16" cy="3.5" rx="1.8" ry="2" fill="#8A6BD1" />
        </Svg>
      )
    default:
      return (
        <Svg size={size}>
          <circle cx="16" cy="16" r="11" fill="none" stroke="#5B6660" strokeWidth="2" />
          <path d="M16 10v7" stroke="#5B6660" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="16" cy="21.5" r="1.6" fill="#5B6660" />
        </Svg>
      )
  }
}

/** Statusikon som kan leses uten farge: ✕ rødt, ? gult, ✓ grønt, – mangler data. */
export function StatusIcon({ status, size = 20 }: { status: 'red' | 'yellow' | 'green' | 'grey'; size?: number }) {
  const fill = { red: '#B42318', yellow: '#8A5300', green: '#18794E', grey: '#8C958F' }[status]
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx="10" cy="10" r="10" fill={fill} />
      {status === 'red' && <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />}
      {status === 'yellow' && (
        <>
          <path d="M7.6 7.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="10" cy="14.6" r="1.2" fill="#fff" />
        </>
      )}
      {status === 'green' && <path d="M5.8 10.3l2.8 2.8 5.6-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
      {status === 'grey' && <path d="M6 10h8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />}
    </svg>
  )
}

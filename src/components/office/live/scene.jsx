// Piezas de la escena isométrica: cajas, salas, muebles, escritorios y robots.
import React from 'react';
import { iso, pts, SX, SY, WALL_OUT, WALL_IN, MOOD } from './layout';


const PROVIDER_SHELL = { '🟠': '#f4a261', '🟢': '#5eead4', '🦞': '#ff7b7b', '⚕️': '#a5b4fc', '🔷': '#7cc4ff' };

// ─── Primitivas ───
export function IsoBox({ x, y, z = 0, w, d, h, top, left, right, stroke = 'rgba(0,0,0,0.28)', className, style }) {
    const A = [x, y], B = [x + w, y], C = [x + w, y + d], D = [x, y + d];
    const P = ([gx, gy], gz) => iso(gx, gy, gz);
    return (
        <g className={className} style={style}>
            <polygon points={pts([P(D, z), P(C, z), P(C, z + h), P(D, z + h)])} fill={left} stroke={stroke} strokeWidth="0.6" />
            <polygon points={pts([P(C, z), P(B, z), P(B, z + h), P(C, z + h)])} fill={right} stroke={stroke} strokeWidth="0.6" />
            <polygon points={pts([P(A, z + h), P(B, z + h), P(C, z + h), P(D, z + h)])} fill={top} stroke={stroke} strokeWidth="0.6" />
        </g>
    );
}

/** Plano de pared: side 'back' corre en x (y fija), 'left' corre en y (x fija). */
const wallPt = (side, gx, gy, u, z) => (side === 'back' ? iso(gx + u, gy, z) : iso(gx, gy + u, z));
const wallQuad = (side, gx, gy, u0, u1, z0, z1) => pts([wallPt(side, gx, gy, u0, z0), wallPt(side, gx, gy, u1, z0), wallPt(side, gx, gy, u1, z1), wallPt(side, gx, gy, u0, z1)]);
/** Matriz para escribir texto pegado a la pared. */
const wallText = (side, gx, gy, u, z) => {
    const [ex, ey] = wallPt(side, gx, gy, u, z);
    return side === 'back' ? `matrix(1,0.5,0,1,${ex},${ey})` : `matrix(1,-0.5,0,1,${ex},${ey})`;
};

const seeded = seed => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

function Windows({ side, gx, gy, len, phase, seed }) {
    const rnd = seeded(seed);
    const panes = [];
    const paneW = 1.35;
    for (let u = 0.55; u + paneW <= len - 0.4; u += paneW + 0.3) panes.push(u);
    const lit = phase === 'night' || phase === 'dusk';
    return (
        <g>
            {panes.map(u0 => {
                const u1 = u0 + paneW;
                const buildings = [];
                for (let b = u0 + 0.05; b < u1 - 0.1; b += 0.18 + rnd() * 0.22) {
                    const bw = Math.min(0.14 + rnd() * 0.2, u1 - 0.05 - b);
                    const bh = 6 + rnd() * 22;
                    buildings.push({ b, bw, bh, lights: Array.from({ length: 3 }, () => rnd()) });
                }
                return (
                    <g key={u0}>
                        <polygon points={wallQuad(side, gx, gy, u0, u1, 22, 60)} fill={`url(#lo-sky-${phase})`} stroke="#2d3a57" strokeWidth="1.4" />
                        {buildings.map(({ b, bw, bh, lights }, i) => (
                            <g key={i}>
                                <polygon points={wallQuad(side, gx, gy, b, b + bw, 22, 22 + bh)} fill={lit ? '#0b1222' : '#5a6f93'} opacity={lit ? 0.95 : 0.55} />
                                {lit && lights.map((l, k) => l > 0.45 && (
                                    <polygon key={k} points={wallQuad(side, gx, gy, b + bw * 0.25 + (k % 2) * bw * 0.35, b + bw * 0.25 + (k % 2) * bw * 0.35 + 0.035, 24 + k * (bh / 4), 25.6 + k * (bh / 4))} fill="#ffd27a" opacity={0.85} />
                                ))}
                            </g>
                        ))}
                        <polygon points={wallQuad(side, gx, gy, u0 + paneW / 2 - 0.015, u0 + paneW / 2 + 0.015, 22, 60)} fill="#2d3a57" />
                        <polygon points={wallQuad(side, gx, gy, u0, u1, 22, 60)} fill="url(#lo-glass-sheen)" />
                    </g>
                );
            })}
        </g>
    );
}

const FLOOR = {
    carpet: (i, j) => ((i + j) % 2 ? '#1a2032' : '#1c2337'),
    concrete: (i, j) => ((i * 7 + j * 3) % 5 === 0 ? '#20262f' : '#1d232c'),
    tech: (i, j) => ((i + j) % 2 ? '#0f1b2a' : '#112033'),
};

// ─── Sala: piso, paredes, ventanas, letrero de neón ───
export function Room({ room, phase, dimmed, hovered, selected, onEnter, onLeave, onClick }) {
    const { gx, gy, w, d, color } = room;
    const tiles = [];
    for (let i = 0; i < w; i++) {
        for (let j = 0; j < d; j++) {
            const fill = room.floor === 'wood' ? ((Math.floor(i / 2) + j) % 2 ? '#2b2420' : '#312923') : FLOOR[room.floor](i, j);
            tiles.push(<polygon key={`${i}-${j}`} points={pts([iso(gx + i, gy + j), iso(gx + i + 1, gy + j), iso(gx + i + 1, gy + j + 1), iso(gx + i, gy + j + 1)])} fill={fill} />);
        }
    }
    const outBack = gy === 0;
    const outLeft = gx === 0;
    const backH = outBack ? WALL_OUT : WALL_IN;
    const leftH = outLeft ? WALL_OUT : WALL_IN;
    const [cx, cy] = iso(gx + w / 2, gy + d / 2);
    const night = phase === 'night' || phase === 'dusk';
    const signZ = outBack ? 64 : WALL_IN - 8;
    const active = hovered || selected;

    return (
        <g className={`lo-room ${dimmed ? 'dim' : ''}`} onPointerEnter={onEnter} onPointerLeave={onLeave} onClick={onClick}>
            <g>{tiles}</g>
            {room.floor === 'tech' && Array.from({ length: w + 1 }, (_, i) => (
                <line key={i} x1={iso(gx + i, gy)[0]} y1={iso(gx + i, gy)[1]} x2={iso(gx + i, gy + d)[0]} y2={iso(gx + i, gy + d)[1]} stroke={color} strokeOpacity="0.12" strokeWidth="0.8" />
            ))}
            {/* Luz de la sala */}
            <ellipse cx={cx} cy={cy} rx={w * SX * 0.95} ry={d * SY * 0.95} fill={`url(#lo-pool-${room.id})`} opacity={night ? 1 : 0.6} />

            {/* Pared del fondo (en x) */}
            {outBack ? (
                <g>
                    <polygon points={wallQuad('back', gx, gy, 0, w, 0, backH)} fill="url(#lo-wall-back)" />
                    <Windows side="back" gx={gx} gy={gy} len={w} phase={phase} seed={gx * 31 + 7} />
                </g>
            ) : (
                <g>
                    <polygon points={wallQuad('back', gx, gy, 0, w / 2 - 0.6, 0, backH)} fill={color} fillOpacity="0.05" stroke={color} strokeOpacity="0.25" strokeWidth="0.8" />
                    <polygon points={wallQuad('back', gx, gy, w / 2 + 0.6, w, 0, backH)} fill={color} fillOpacity="0.05" stroke={color} strokeOpacity="0.25" strokeWidth="0.8" />
                </g>
            )}
            {/* Pared izquierda (en y) */}
            {outLeft ? (
                <g>
                    <polygon points={wallQuad('left', gx, gy, 0, d, 0, leftH)} fill="url(#lo-wall-left)" />
                    <Windows side="left" gx={gx} gy={gy} len={d} phase={phase} seed={gy * 17 + 3} />
                </g>
            ) : (
                <g>
                    <polygon points={wallQuad('left', gx, gy, 0, d / 2 - 0.6, 0, leftH)} fill={color} fillOpacity="0.05" stroke={color} strokeOpacity="0.25" strokeWidth="0.8" />
                    <polygon points={wallQuad('left', gx, gy, d / 2 + 0.6, d, 0, leftH)} fill={color} fillOpacity="0.05" stroke={color} strokeOpacity="0.25" strokeWidth="0.8" />
                </g>
            )}
            {/* Zócalo LED */}
            <polyline points={pts([iso(gx, gy + d), iso(gx, gy), iso(gx + w, gy)])} fill="none" stroke={color} strokeWidth={active ? 3 : 2} strokeOpacity={active ? 0.95 : 0.6} filter="url(#lo-glow)" />
            {/* Borde de selección */}
            {active && (
                <polygon points={pts([iso(gx, gy), iso(gx + w, gy), iso(gx + w, gy + d), iso(gx, gy + d)])} fill={color} fillOpacity="0.05" stroke={color} strokeWidth="1.6" strokeDasharray={selected ? '0' : '6 5'} className="lo-room-outline" />
            )}
            {/* Letrero de neón */}
            <g transform={wallText('back', gx, gy, 0.45, signZ)} className="lo-neon" style={{ '--neon': color }}>
                <text x="0" y="0" fontSize="11.5" fontWeight="800" letterSpacing="0.06em" fill={color} filter="url(#lo-glow)">{room.icon} {room.name.toUpperCase()}</text>
            </g>
        </g>
    );
}

// ─── Muebles ───
function Plant({ x, y }) {
    const [px, py] = iso(x, y, 12);
    return (
        <g>
            <IsoBox x={x - 0.2} y={y - 0.2} w={0.4} d={0.4} h={12} top="#3a2a22" left="#5b3a2b" right="#6e4733" />
            <g className="lo-sway" style={{ transformOrigin: `${px}px ${py}px` }}>
                <ellipse cx={px - 5} cy={py - 8} rx="7" ry="9" fill="#1f7a4d" />
                <ellipse cx={px + 5} cy={py - 10} rx="7" ry="10" fill="#26935b" />
                <ellipse cx={px} cy={py - 17} rx="6" ry="8" fill="#2fb06c" />
            </g>
        </g>
    );
}

function Sofa({ x, y, rot, color = '#3b4a6b' }) {
    const along = rot === 'left';
    const w = along ? 0.8 : 1.8, d = along ? 1.8 : 0.8;
    return (
        <g>
            <IsoBox x={x} y={y} w={w} d={d} h={9} top={color} left="#26314a" right="#2e3a56" />
            {along
                ? <IsoBox x={x + w - 0.22} y={y} w={0.22} d={d} h={20} top="#46577d" left="#26314a" right="#33415f" />
                : <IsoBox x={x} y={y} w={w} d={0.22} h={20} top="#46577d" left="#33415f" right="#2e3a56" />}
        </g>
    );
}

function Shelf({ x, y }) {
    const books = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#a855f7', '#ec4899', '#38bdf8'];
    return (
        <g>
            <IsoBox x={x} y={y} w={0.4} d={1.9} h={50} top="#3d3029" left="#2f241f" right="#4a3a31" />
            {[10, 24, 38].map((z, r) => books.map((c, i) => {
                const u = y + 0.12 + i * 0.24;
                const h = 8 + ((i * 3 + r) % 4);
                return <polygon key={`${r}-${i}`} points={pts([iso(x + 0.4, u, z), iso(x + 0.4, u + 0.17, z), iso(x + 0.4, u + 0.17, z + h), iso(x + 0.4, u, z + h)])} fill={c} opacity="0.85" />;
            }))}
        </g>
    );
}

function Whiteboard({ x, gyRoom }) {
    const yy = gyRoom + 0.06;
    return (
        <g>
            <polygon points={pts([iso(x, yy, 18), iso(x + 2.6, yy, 18), iso(x + 2.6, yy, 50), iso(x, yy, 50)])} fill="#e8eef9" stroke="#94a3b8" strokeWidth="1" />
            <polyline points={pts([iso(x + 0.3, yy, 40), iso(x + 0.9, yy, 44), iso(x + 1.4, yy, 36), iso(x + 2.1, yy, 42)])} fill="none" stroke="#3b82f6" strokeWidth="1.4" />
            <polyline points={pts([iso(x + 0.3, yy, 28), iso(x + 1.6, yy, 28)])} fill="none" stroke="#ef4444" strokeWidth="1.2" />
            <polyline points={pts([iso(x + 0.3, yy, 24), iso(x + 2.2, yy, 24)])} fill="none" stroke="#64748b" strokeWidth="1" />
        </g>
    );
}

function ScreenWall({ y, gxRoom, color }) {
    const xx = gxRoom + 0.06;
    const bars = [0.5, 0.8, 0.35, 0.95, 0.6, 0.75];
    return (
        <g>
            <polygon points={pts([iso(xx, y, 16), iso(xx, y + 3, 16), iso(xx, y + 3, 54), iso(xx, y, 54)])} fill="#070b14" stroke="#334155" strokeWidth="1.2" />
            {bars.map((b, i) => {
                const u = y + 0.3 + i * 0.42;
                return (
                    <polygon key={i} className="lo-bar" style={{ animationDelay: `${i * 0.3}s`, transformOrigin: `${iso(xx, u, 20)[0]}px ${iso(xx, u, 20)[1]}px` }}
                        points={pts([iso(xx, u, 20), iso(xx, u + 0.25, 20), iso(xx, u + 0.25, 20 + b * 28), iso(xx, u, 20 + b * 28)])} fill={color} opacity="0.8" />
                );
            })}
        </g>
    );
}

function Server({ x, y }) {
    return (
        <g>
            <IsoBox x={x} y={y} w={0.75} d={0.75} h={52} top="#1e2636" left="#0d1220" right="#151c2c" />
            {Array.from({ length: 7 }, (_, i) => {
                const [lx, ly] = iso(x + 0.25, y + 0.75, 8 + i * 6.3);
                return <circle key={i} cx={lx} cy={ly} r="1.4" fill={i % 3 ? '#22d3ee' : '#2ee59d'} className="lo-led" style={{ animationDelay: `${(i * 0.37) % 1.6}s` }} />;
            })}
        </g>
    );
}

function ConfTable({ x, y, warMode }) {
    const [cx, cy] = iso(x, y, 14);
    const c = warMode ? '#ff5d6c' : '#9b6bff';
    return (
        <g>
            <IsoBox x={x - 1.6} y={y - 1.1} w={3.2} d={2.2} h={14} top={warMode ? '#3a1218' : '#221a3d'} left="#151026" right="#1c1533" stroke={c} />
            <ellipse cx={cx} cy={cy} rx="30" ry="15" fill={c} opacity="0.15" />
            <g className="lo-holo" style={{ transformOrigin: `${cx}px ${cy - 26}px` }}>
                <polygon points={`${cx},${cy - 44} ${cx + 12},${cy - 26} ${cx},${cy - 8} ${cx - 12},${cy - 26}`} fill={c} fillOpacity="0.25" stroke={c} strokeWidth="1.2" />
                <line x1={cx} y1={cy - 44} x2={cx} y2={cy - 8} stroke={c} strokeOpacity="0.6" />
            </g>
            <polygon points={`${cx - 14},${cy} ${cx + 14},${cy} ${cx + 4},${cy - 40} ${cx - 4},${cy - 40}`} fill={`url(#lo-beam)`} opacity="0.5" />
        </g>
    );
}

function Tripod({ x, y }) {
    const [bx, by] = iso(x, y);
    return (
        <g stroke="#94a3b8" strokeWidth="1.4">
            <line x1={bx - 8} y1={by + 3} x2={bx} y2={by - 26} /><line x1={bx + 8} y1={by + 3} x2={bx} y2={by - 26} /><line x1={bx} y1={by + 5} x2={bx} y2={by - 26} />
            <rect x={bx - 8} y={by - 36} width="16" height="11" rx="2" fill="#111827" stroke="#475569" />
            <circle cx={bx + 9} cy={by - 30} r="3.5" fill="#1f2937" stroke="#475569" />
            <circle cx={bx - 4} cy={by - 33} r="1.6" fill="#ef4444" stroke="none" className="lo-led" />
        </g>
    );
}

function RingLight({ x, y }) {
    const [bx, by] = iso(x, y);
    return (
        <g>
            <line x1={bx} y1={by} x2={bx} y2={by - 34} stroke="#64748b" strokeWidth="1.4" />
            <circle cx={bx} cy={by - 44} r="10" fill="none" stroke="#fff6e0" strokeWidth="3" filter="url(#lo-glow)" />
        </g>
    );
}

function Boxes({ x, y }) {
    return (
        <g>
            <IsoBox x={x} y={y - 0.3} w={0.7} d={0.7} h={14} top="#c4935a" left="#9a6f40" right="#b0814d" />
            <IsoBox x={x + 0.8} y={y - 0.3} w={0.6} d={0.6} h={12} top="#c4935a" left="#9a6f40" right="#b0814d" />
            <IsoBox x={x + 0.1} y={y - 0.2} z={14} w={0.5} d={0.5} h={11} top="#d4a26a" left="#9a6f40" right="#b0814d" />
        </g>
    );
}

function MapTable({ x, y, color }) {
    return (
        <g>
            <IsoBox x={x - 0.8} y={y - 0.5} w={1.6} d={1.1} h={15} top="#123a2b" left="#0f2219" right="#14301f" stroke={color} />
            {[[0.2, 0.3], [-0.3, 0.1], [0.45, -0.2]].map(([dx, dy], i) => {
                const [px, py] = iso(x + dx, y + dy, 15);
                return <circle key={i} cx={px} cy={py} r="2.2" fill={color} className="lo-led" style={{ animationDelay: `${i * 0.5}s` }} />;
            })}
        </g>
    );
}

function Bar({ x, y, color }) {
    return (
        <g>
            <IsoBox x={x} y={y} w={3.4} d={0.7} h={19} top="#2a1838" left="#1b0f26" right="#24142f" stroke={color} />
            {Array.from({ length: 7 }, (_, i) => {
                const [bx, by] = iso(x + 0.3 + i * 0.45, y + 0.3, 19);
                return <rect key={i} x={bx - 1.5} y={by - 10} width="3" height="10" rx="1" fill={['#facc15', '#22d3ee', '#f472b6', '#a3e635'][i % 4]} opacity="0.9" />;
            })}
            <polyline points={pts([iso(x, y + 0.7, 2), iso(x + 3.4, y + 0.7, 2)])} stroke={color} strokeWidth="2" filter="url(#lo-glow)" />
        </g>
    );
}

function Antenna({ x, y, color }) {
    const [bx, by] = iso(x, y);
    return (
        <g>
            <IsoBox x={x - 0.3} y={y - 0.3} w={0.6} d={0.6} h={6} top="#273244" left="#141b27" right="#1b2433" />
            <line x1={bx} y1={by - 6} x2={bx} y2={by - 62} stroke="#94a3b8" strokeWidth="2" />
            <line x1={bx - 7} y1={by - 30} x2={bx} y2={by - 50} stroke="#64748b" /><line x1={bx + 7} y1={by - 30} x2={bx} y2={by - 50} stroke="#64748b" />
            <circle cx={bx} cy={by - 64} r="3" fill={color} filter="url(#lo-glow)" />
            {[0, 1, 2].map(i => <circle key={i} cx={bx} cy={by - 64} r="6" fill="none" stroke={color} strokeWidth="1.4" className="lo-wave" style={{ animationDelay: `${i * 0.8}s`, transformOrigin: `${bx}px ${by - 64}px` }} />)}
        </g>
    );
}

function Radar({ x, y, color }) {
    const [bx, by] = iso(x, y);
    return (
        <g>
            <line x1={bx} y1={by} x2={bx} y2={by - 20} stroke="#475569" strokeWidth="2" />
            <circle cx={bx} cy={by - 36} r="16" fill="#0a0f1a" stroke={color} strokeOpacity="0.6" />
            <circle cx={bx} cy={by - 36} r="9" fill="none" stroke={color} strokeOpacity="0.25" />
            <g className="lo-sweep" style={{ transformOrigin: `${bx}px ${by - 36}px` }}>
                <path d={`M ${bx} ${by - 36} L ${bx + 16} ${by - 36} A 16 16 0 0 0 ${bx + 11} ${by - 47.5} Z`} fill={color} opacity="0.45" />
            </g>
            <circle cx={bx + 6} cy={by - 40} r="1.6" fill={color} className="lo-led" />
        </g>
    );
}

function Portal({ x, y, color }) {
    const [cx, cy] = iso(x, y);
    return (
        <g>
            <ellipse cx={cx} cy={cy} rx="44" ry="22" fill="none" stroke={color} strokeWidth="2.5" filter="url(#lo-glow)" />
            <ellipse cx={cx} cy={cy} rx="30" ry="15" fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.5" className="lo-portal" style={{ transformOrigin: `${cx}px ${cy}px` }} />
            <polygon points={`${cx - 30},${cy} ${cx + 30},${cy} ${cx + 22},${cy - 90} ${cx - 22},${cy - 90}`} fill="url(#lo-beam)" opacity="0.55" />
            {Array.from({ length: 6 }, (_, i) => (
                <circle key={i} cx={cx - 20 + i * 8} cy={cy - 4} r="1.8" fill={color} className="lo-rise" style={{ animationDelay: `${i * 0.45}s` }} />
            ))}
            <text x={cx} y={cy + 36} textAnchor="middle" fontSize="9" fontWeight="800" fill={color} letterSpacing="0.12em" opacity="0.8">PUERTA MCP</text>
        </g>
    );
}

function Coffee({ x, y }) {
    const [mx, my] = iso(x + 0.5, y + 0.3, 20);
    return (
        <g>
            <IsoBox x={x - 0.6} y={y} w={1.6} d={0.7} h={19} top="#3a2c25" left="#271d18" right="#30241e" />
            <IsoBox x={x + 0.25} y={y + 0.1} z={19} w={0.5} d={0.45} h={16} top="#555" left="#2b2b2b" right="#3a3a3a" />
            {[0, 1].map(i => <path key={i} d={`M ${mx - 2 + i * 4} ${my - 18} q 3 -5 0 -10 q -3 -5 0 -10`} fill="none" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" className="lo-steam" style={{ animationDelay: `${i * 0.9}s` }} />)}
            <text x={mx - 26} y={my - 1} fontSize="9" fill="#d4a373" fontWeight="800" letterSpacing="0.08em">☕ CAFÉ</text>
        </g>
    );
}

function Rug({ x, y, w, d, color }) {
    return <polygon points={pts([iso(x, y), iso(x + w, y), iso(x + w, y + d), iso(x, y + d)])} fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.35" strokeDasharray="4 3" />;
}

export function Prop({ p, room, warMode }) {
    const x = room.gx + p.x, y = room.gy + p.y, c = room.color;
    switch (p.t) {
        case 'plant': return <Plant x={x} y={y} />;
        case 'sofa': return <Sofa x={x} y={y} rot={p.rot} />;
        case 'shelf': return <Shelf x={x} y={y} />;
        case 'whiteboard': return <Whiteboard x={x} y={y} gyRoom={room.gy} />;
        case 'screenwall': return <ScreenWall x={x} y={y} gxRoom={room.gx} color={c} />;
        case 'server': return <Server x={x} y={y} />;
        case 'conftable': return <ConfTable x={x} y={y} warMode={warMode} />;
        case 'tripod': return <Tripod x={x} y={y} />;
        case 'ringlight': return <RingLight x={x} y={y} />;
        case 'boxes': return <Boxes x={x} y={y} />;
        case 'maptable': return <MapTable x={x} y={y} color={c} />;
        case 'bar': return <Bar x={x} y={y} color={c} />;
        case 'antenna': return <Antenna x={x} y={y} color={c} />;
        case 'radar': return <Radar x={x} y={y} color={c} />;
        case 'portal': return <Portal x={x} y={y} color={c} />;
        case 'coffee': return <Coffee x={x} y={y} />;
        case 'rug': return <Rug x={x} y={y} w={p.w} d={p.d} color={c} />;
        default: return null;
    }
}

// ─── Escritorios ───
export function Desk({ desk, working, statusColor }) {
    const { x, y, color } = desk;
    if (desk.pod) {
        const [cx, cy] = iso(x, y, 10);
        return (
            <g>
                <IsoBox x={x - 0.45} y={y - 0.3} w={0.9} d={0.6} h={10} top="#16243a" left="#0d1726" right="#122033" stroke={color} />
                <polygon points={`${cx - 12},${cy - 4} ${cx + 12},${cy - 4} ${cx + 9},${cy - 22} ${cx - 9},${cy - 22}`} fill={statusColor} fillOpacity={working ? 0.35 : 0.12} stroke={statusColor} strokeOpacity="0.7" className={working ? 'lo-screen-on' : ''} />
            </g>
        );
    }
    const [mx, my] = iso(x, y - 0.12, 13);
    return (
        <g>
            <IsoBox x={x - 0.78} y={y - 0.36} w={1.56} d={0.72} h={13} top="#2e3a52" left="#1b2335" right="#232d42" />
            <polyline points={pts([iso(x - 0.78, y + 0.36, 13), iso(x + 0.78, y + 0.36, 13)])} stroke={color} strokeOpacity="0.7" strokeWidth="1.2" />
            {/* Monitor (lo ves por detrás; el brillo sale hacia el agente) */}
            <ellipse cx={mx} cy={my - 12} rx="20" ry="12" fill={statusColor} opacity={working ? 0.28 : 0.08} className={working ? 'lo-screen-on' : ''} />
            <polygon points={pts([iso(x - 0.42, y - 0.1, 14), iso(x + 0.42, y - 0.1, 14), iso(x + 0.42, y - 0.1, 31), iso(x - 0.42, y - 0.1, 31)])} fill="#0c111c" stroke="#3a4762" strokeWidth="1" />
            <rect x={mx - 1.5} y={my - 2} width="3" height="3" fill="#3a4762" />
            {/* Teclado y taza */}
            <polygon points={pts([iso(x - 0.3, y + 0.08, 13.4), iso(x + 0.3, y + 0.08, 13.4), iso(x + 0.3, y + 0.22, 13.4), iso(x - 0.3, y + 0.22, 13.4)])} fill="#4b5878" />
            <rect x={iso(x + 0.6, y + 0.2, 13)[0] - 2.5} y={iso(x + 0.6, y + 0.2, 13)[1] - 5} width="5" height="5" rx="1.2" fill="#e2e8f0" />
        </g>
    );
}

export function CeoDesk({ x, y, reviewCount, approvalCount }) {
    const [tx, ty] = iso(x + 0.95, y + 0.05, 17);
    return (
        <g>
            <IsoBox x={x - 1.25} y={y - 0.5} w={2.5} d={1} h={16} top="#3b2f1a" left="#261d10" right="#30251a" stroke="#f5b638" />
            <polyline points={pts([iso(x - 1.25, y + 0.5, 16), iso(x + 1.25, y + 0.5, 16)])} stroke="#f5b638" strokeWidth="1.5" filter="url(#lo-glow)" />
            <polygon points={pts([iso(x - 0.6, y - 0.25, 17), iso(x + 0.3, y - 0.25, 17), iso(x + 0.3, y - 0.25, 36), iso(x - 0.6, y - 0.25, 36)])} fill="#0c111c" stroke="#f5b638" strokeOpacity="0.6" />
            {/* Bandeja de entregas */}
            <g className={reviewCount ? 'lo-tray-busy' : ''}>
                <IsoBox x={x + 0.65} y={y - 0.2} z={16} w={0.6} d={0.45} h={3} top="#1a1308" left="#3b2f1a" right="#4a3b22" stroke="#f5b638" />
                {Array.from({ length: Math.min(reviewCount, 5) }, (_, i) => (
                    <polygon key={i} points={pts([iso(x + 0.7, y - 0.15, 19 + i * 1.6), iso(x + 1.2, y - 0.15, 19 + i * 1.6), iso(x + 1.2, y + 0.2, 19 + i * 1.6), iso(x + 0.7, y + 0.2, 19 + i * 1.6)])} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
                ))}
                {reviewCount > 0 && (
                    <g transform={`translate(${tx + 8}, ${ty - 22})`}>
                        <circle r="8" fill="#b07cff" stroke="#fff" strokeWidth="1.2" />
                        <text y="3" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fff">{reviewCount}</text>
                    </g>
                )}
            </g>
            {approvalCount > 0 && (
                <g transform={`translate(${tx - 46}, ${ty - 24})`} className="lo-bounce">
                    <circle r="8" fill="#f5b638" stroke="#fff" strokeWidth="1.2" />
                    <text y="3.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#1a1308">!</text>
                </g>
            )}
        </g>
    );
}

// ─── Robots ───
export function Bot({ agent, mood, pose, color, tint, selected }) {
    const m = MOOD[mood] || MOOD.idle;
    const ext = agent.kind === 'external';
    const shell = ext ? (PROVIDER_SHELL[agent.avatar] || '#cbd5e1') : '#e8edf7';
    const body = ext ? '#1f2a3d' : color;
    const sit = pose === 'sit';
    const lift = sit ? 6 : 0;
    const eyes = mood === 'error' ? 'x' : mood === 'sleep' ? 'line' : 'dot';
    const hairish = tint % 3;

    return (
        <g className={`lo-bot lo-mood-${mood} ${sit ? 'sit' : 'stand'}`} opacity={mood === 'sleep' ? 0.55 : 1}>
            <ellipse cx="0" cy="0" rx="11" ry="5" fill="#000" opacity="0.35" />
            {selected && <ellipse cx="0" cy="0" rx="17" ry="8.5" fill="none" stroke={color} strokeWidth="2" className="lo-select-ring" />}
            <g transform={`translate(0, ${lift})`}><g className="lo-bob">
                {!sit && (
                    <g className="lo-legs">
                        <rect className="lo-leg-l" x="-6" y="-11" width="4" height="11" rx="2" fill="#2a3346" />
                        <rect className="lo-leg-r" x="2" y="-11" width="4" height="11" rx="2" fill="#2a3346" />
                    </g>
                )}
                {/* Brazos */}
                <rect className="lo-arm-l" x="-13" y="-25" width="4.5" height="13" rx="2.2" fill={body} stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
                <rect className="lo-arm-r" x="8.5" y="-25" width="4.5" height="13" rx="2.2" fill={body} stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
                {/* Cuerpo */}
                <rect x="-9.5" y="-28" width="19" height="18" rx="6" fill={body} stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
                <rect x="-9.5" y="-28" width="19" height="7" rx="5" fill="#fff" opacity="0.12" />
                <circle cx="0" cy="-19" r="5.2" fill="#0b1020" stroke={m.color} strokeWidth="1" />
                <text x="0" y="-16.6" textAnchor="middle" fontSize="6.6">{agent.avatar || '🤖'}</text>
                {/* Cabeza */}
                <rect x="-11" y="-47" width="22" height="18" rx="7" fill={shell} stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
                {hairish === 1 && !ext && <rect x="-11" y="-47" width="22" height="5" rx="3" fill={color} opacity="0.8" />}
                <rect x="-8.5" y="-43" width="17" height="10" rx="4.5" fill="#0b1020" />
                {eyes === 'dot' && (
                    <g className="lo-eyes" fill={m.color}>
                        <rect x="-5.5" y="-40.5" width="3.6" height="5" rx="1.8" />
                        <rect x="1.9" y="-40.5" width="3.6" height="5" rx="1.8" />
                    </g>
                )}
                {eyes === 'line' && <g stroke={m.color} strokeWidth="1.4" strokeLinecap="round"><line x1="-5.5" y1="-38" x2="-2" y2="-38" /><line x1="2" y1="-38" x2="5.5" y2="-38" /></g>}
                {eyes === 'x' && <g stroke={m.color} strokeWidth="1.3" strokeLinecap="round"><path d="M-5.5 -40.5 l3 4 m0 -4 l-3 4" /><path d="M2.5 -40.5 l3 4 m0 -4 l-3 4" /></g>}
                {/* Antena */}
                <line x1="0" y1="-47" x2="0" y2="-53" stroke="#94a3b8" strokeWidth="1.4" />
                <circle cx="0" cy="-54.5" r="2.3" fill={m.color} className="lo-antenna" />
            </g></g>
        </g>
    );
}

/** Lo que el robot muestra sobre la cabeza: nombre, estado y burbuja. */
export function BotOverlay({ agent, mood, pose, reviews, showStep, showName }) {
    const m = MOOD[mood] || MOOD.idle;
    const top = pose === 'sit' ? -54 : -62;
    const name = agent.name.split(' (')[0];
    const nameW = Math.max(46, name.length * 5.6 + 22);
    const step = (agent.currentStep || agent.currentTaskName || '').replace(/^.*trabajando con [^\s]+$/i, agent.currentTaskName || '');
    const stepText = step.length > 34 ? `${step.slice(0, 33)}…` : step;
    return (
        <g>
            {showName && (
                <g transform={`translate(0, ${top - 6})`}>
                    <rect x={-nameW / 2} y="-9" width={nameW} height="15" rx="7.5" fill="#070a12" fillOpacity="0.92" stroke={m.color} strokeWidth="1" />
                    <circle cx={-nameW / 2 + 8} cy="-1.5" r="2.8" fill={m.color} />
                    <text x={-nameW / 2 + 14} y="2" fontSize="8.4" fontWeight="800" fill="#f8fafc">{name}</text>
                </g>
            )}
            {mood === 'work' && showStep && stepText && (
                <g transform={`translate(0, ${top - 26})`} className="lo-pop">
                    <rect x={-Math.min(stepText.length * 2.6 + 18, 110)} y="-10" width={Math.min(stepText.length * 5.2 + 36, 220)} height="16" rx="5" fill="#0b1626" stroke="#38bdf8" strokeWidth="1" />
                    <text x={-Math.min(stepText.length * 2.6 + 18, 110) + 7} y="1.6" fontSize="7.6" fill="#bae6fd" fontWeight="600">⌨ {stepText}</text>
                </g>
            )}
            {mood === 'work' && (
                <g transform={`translate(14, ${top + 2})`}>
                    {['{ }', '</>', '✦'].map((s, i) => <text key={i} fontSize="7" fill="#38bdf8" className="lo-code" style={{ animationDelay: `${i * 0.6}s` }}>{s}</text>)}
                </g>
            )}
            {mood === 'deliver' && (
                <g transform={`translate(13, ${top + 14})`} className="lo-bounce">
                    <path d="M -6 -9 h 8 l 4 4 v 10 h -12 z" fill="#f8fafc" stroke="#b07cff" strokeWidth="1.2" />
                    <path d="M 2 -9 v 4 h 4" fill="none" stroke="#b07cff" strokeWidth="1" />
                    <line x1="-3.5" y1="-2" x2="3" y2="-2" stroke="#94a3b8" /><line x1="-3.5" y1="1" x2="3" y2="1" stroke="#94a3b8" />
                    {reviews.length > 1 && <g transform="translate(7,-9)"><circle r="5" fill="#b07cff" /><text y="2.6" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff">{reviews.length}</text></g>}
                </g>
            )}
            {mood === 'ask' && <Bubble y={top - 22} color="#f5b638" text="?" />}
            {mood === 'error' && <Bubble y={top - 22} color="#ff5d6c" text="!" />}
            {mood === 'coffee' && <text x="10" y={top + 26} fontSize="10">☕</text>}
            {mood === 'sleep' && (
                <g transform={`translate(10, ${top + 6})`} fill="#94a3b8" fontWeight="800">
                    <text fontSize="8" className="lo-zz">z</text>
                    <text fontSize="10" className="lo-zz" style={{ animationDelay: '0.8s' }} x="5" y="-6">z</text>
                </g>
            )}
        </g>
    );
}

function Bubble({ y, color, text }) {
    return (
        <g transform={`translate(0, ${y})`} className="lo-bounce">
            <circle r="8.5" fill={color} stroke="#fff" strokeWidth="1.2" />
            <polygon points="-3,7 3,7 0,12" fill={color} />
            <text y="3.8" textAnchor="middle" fontSize="11" fontWeight="900" fill="#0b1020">{text}</text>
        </g>
    );
}

/** Personaje del CEO (tú), sentado tras su escritorio. */
export function CeoBot() {
    return (
        <g>
            <IsoBox x={-0.35} y={-0.2} w={0.7} d={0.35} h={34} top="#3b2f1a" left="#2a2112" right="#33281a" />
            <g transform="translate(0,6)">
                <rect x="-9.5" y="-28" width="19" height="18" rx="6" fill="#1f2430" stroke="#f5b638" strokeWidth="1" />
                <polygon points="-3,-28 3,-28 0,-20" fill="#f5b638" />
                <rect x="-11" y="-47" width="22" height="18" rx="7" fill="#f5d27a" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
                <rect x="-8.5" y="-43" width="17" height="10" rx="4.5" fill="#0b1020" />
                <g fill="#f5b638" className="lo-eyes"><rect x="-5.5" y="-40.5" width="3.6" height="5" rx="1.8" /><rect x="1.9" y="-40.5" width="3.6" height="5" rx="1.8" /></g>
                <text x="0" y="-49" textAnchor="middle" fontSize="11">👑</text>
            </g>
        </g>
    );
}

export function SceneDefs({ rooms, warMode }) {
    return (
    <defs>
        <filter id="lo-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="lo-wall-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#222d45" /><stop offset="1" stopColor="#151c2e" /></linearGradient>
        <linearGradient id="lo-wall-left" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b2439" /><stop offset="1" stopColor="#10172a" /></linearGradient>
        <linearGradient id="lo-sky-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#050a1c" /><stop offset="1" stopColor="#1c2550" /></linearGradient>
        <linearGradient id="lo-sky-dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2b2a6b" /><stop offset="0.6" stopColor="#c2557a" /><stop offset="1" stopColor="#f59e5b" /></linearGradient>
        <linearGradient id="lo-sky-dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a4a8c" /><stop offset="1" stopColor="#f4b183" /></linearGradient>
        <linearGradient id="lo-sky-day" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4aa3ff" /><stop offset="1" stopColor="#b9e2ff" /></linearGradient>
        <linearGradient id="lo-glass-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.14" /><stop offset="0.45" stopColor="#fff" stopOpacity="0" /><stop offset="0.6" stopColor="#fff" stopOpacity="0.06" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <linearGradient id="lo-beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={warMode ? '#ff5d6c' : '#7dd3fc'} stopOpacity="0.55" /><stop offset="1" stopColor={warMode ? '#ff5d6c' : '#7dd3fc'} stopOpacity="0" /></linearGradient>
        <radialGradient id="lo-ground" cx="50%" cy="50%" r="60%"><stop offset="0" stopColor={warMode ? '#3a0d16' : '#16203a'} /><stop offset="1" stopColor="#05070d" stopOpacity="0" /></radialGradient>
        {rooms.map(r => (
            <radialGradient key={r.id} id={`lo-pool-${r.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor={warMode && r.id === 'room-meeting' ? '#ff5d6c' : r.color} stopOpacity="0.22" />
                <stop offset="1" stopColor={r.color} stopOpacity="0" />
            </radialGradient>
        ))}
    </defs>
    );
}

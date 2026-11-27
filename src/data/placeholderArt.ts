/**
 * Simple placeholder pictures for the example enemies: a green goblin head on a dark card background,
 * drawn as SVG so they cost almost nothing to store. Replace them with photos of your miniatures.
 */

export type ArtStyle = 'silhouette' | 'shaded' | 'line';
type Kind = 'goblin' | 'archer' | 'troll' | 'king' | 'warlord';
type Role = 'skin' | 'shade' | 'dark' | 'gold' | 'metal' | 'hood' | 'eye' | 'tooth';

const SKIN = { goblin: ['#6f9a3f', '#4c7029'], troll: ['#7d8a62', '#596447'] };
const COLORS: Record<Exclude<Role, 'skin' | 'shade'>, string> = {
  dark: '#22180f', gold: '#e0b04a', metal: '#5b5a63', hood: '#4a3b28', eye: '#f3d27a', tooth: '#efe6d6',
};

function picture(body: string, boss = false): string {
  const [from, to] = boss ? ['#3a2747', '#17111d'] : ['#2f3a22', '#13110c'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
<defs><radialGradient id="g" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></radialGradient>
<clipPath id="c"><rect width="400" height="300"/></clipPath></defs>
<rect width="400" height="300" fill="url(#g)"/><g clip-path="url(#c)" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/\n/g, ''));
}

/** Mirror a path drawn on the left half to the right half (x → 400 − x). */
const mirror = (d: string) => d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${400 - Number(x)} ${y}`);

function head(kind: Kind, style: ArtStyle): string {
  const troll = kind === 'troll';
  const [skin, shade] = troll ? SKIN.troll : SKIN.goblin;
  // Fill and outline for each part, depending on the drawing style.
  const paint = (role: Role): string => {
    const col = role === 'skin' ? skin : role === 'shade' ? shade : COLORS[role];
    if (style === 'line') {
      if (role === 'eye') return `fill="${COLORS.eye}" stroke="none"`;
      if (role === 'dark') return `fill="none" stroke="${skin}" stroke-width="5"`;
      if (role === 'shade') return `fill="none" stroke="${skin}" stroke-width="3"`;
      return `fill="#1a1611" stroke="${role === 'gold' ? COLORS.gold : role === 'metal' ? '#8d8c96' : skin}" stroke-width="6"`;
    }
    if (style === 'silhouette') {
      if (role === 'shade' || role === 'tooth') return 'fill="none" stroke="none"';
      if (role === 'dark') return 'fill="none" stroke="none"';
      if (role === 'skin' || role === 'hood') return `fill="${role === 'hood' ? '#3b4a2a' : skin}" stroke="none"`;
    }
    return role === 'dark' ? `fill="none" stroke="${COLORS.dark}" stroke-width="5"` : `fill="${col}" stroke="none"`;
  };
  const p = (role: Role, d: string) => `<path ${paint(role)} d="${d}"/>`;
  const both = (role: Role, d: string) => p(role, d) + p(role, mirror(d));
  const out: string[] = [];

  if (kind === 'archer') out.push(p('hood', 'M200 58 C282 58 320 128 312 212 L330 300 L70 300 L88 212 C80 128 118 58 200 58 Z'));

  if (troll) {
    out.push(both('skin', 'M122 150 C96 138 84 160 96 178 C106 190 120 184 128 176 Z'));
    out.push(p('skin', 'M200 96 C272 96 304 140 300 188 C296 240 256 268 200 270 C144 268 104 240 100 188 C96 140 128 96 200 96 Z'));
    out.push(p('shade', 'M132 214 C150 252 250 252 268 214 C262 250 236 268 200 270 C164 268 138 250 132 214 Z'));
    out.push(p('shade', 'M140 146 C170 128 230 128 260 146 C240 140 160 140 140 146 Z'));
    out.push(p('dark', 'M146 146 Q170 136 192 152 M254 146 Q230 136 208 152'));
    out.push(both('eye', 'M166 164 Q177 154 188 164 Q177 172 166 164 Z'));
    out.push(p('shade', 'M188 176 Q200 206 212 176 Q214 198 200 204 Q186 198 188 176 Z'));
    out.push(p('dark', 'M156 228 Q200 244 244 228'));
    out.push(both('tooth', 'M164 230 L170 196 L180 232 Z'));
  } else {
    out.push(both('skin', 'M150 148 Q92 116 30 92 Q80 160 152 196 Z'));
    out.push(both('shade', 'M146 156 Q100 132 62 116 Q96 160 148 184 Z'));
    out.push(p('skin', 'M200 94 C252 94 274 130 272 170 C270 212 238 246 200 252 C162 246 130 212 128 170 C126 130 148 94 200 94 Z'));
    out.push(p('shade', 'M140 200 C156 236 244 236 260 200 C250 232 228 248 200 252 C172 248 150 232 140 200 Z'));
    out.push(p('dark', kind === 'warlord' ? 'M150 146 L192 160 M250 146 L208 160' : 'M152 150 L190 158 M248 150 L210 158'));
    out.push(both('eye', 'M160 170 Q174 158 190 170 Q174 178 160 170 Z'));
    out.push(p('shade', 'M196 166 Q222 200 204 210 Q192 212 190 202 Q200 198 196 166 Z'));
    out.push(p('dark', 'M168 222 Q200 236 232 222'));
    out.push(both('tooth', 'M178 224 L183 238 L188 226 Z'));
  }

  if (kind === 'king') {
    out.push(p('gold', 'M148 112 L146 62 L172 86 L200 48 L228 86 L254 62 L252 112 Q200 98 148 112 Z'));
    if (style !== 'silhouette') out.push(p('hood', 'M194 80 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 Z'));
  }
  if (kind === 'warlord') {
    out.push(p('metal', 'M128 160 C126 104 158 80 200 80 C242 80 274 104 272 160 Q200 130 128 160 Z'));
    out.push(both('metal', 'M142 112 C104 104 82 74 90 30 C104 66 128 82 160 92 Z'));
    out.push(p('dark', 'M232 140 L216 196'));
  }
  if (kind === 'archer') out.push(p('hood', 'M136 126 C150 76 250 76 264 126 C240 104 160 104 136 126 Z'));
  return out.join('');
}

export function goblinArt(kind: Kind, style: ArtStyle): string {
  return picture(head(kind, style), kind === 'warlord');
}

const STYLE: ArtStyle = 'shaded';
export const PLACEHOLDER_ART: Record<string, string> = {
  Goblin: goblinArt('goblin', STYLE),
  'Goblin Archer': goblinArt('archer', STYLE),
  'Cave Troll': goblinArt('troll', STYLE),
  'Goblin King': goblinArt('king', STYLE),
  'Goblin Warlord': goblinArt('warlord', STYLE),
};

/** Placeholders are SVG; photos and uploads are stored as JPEG. */
export function isPlaceholderArt(src: string): boolean {
  return src.startsWith('data:image/svg+xml');
}

/** Monograma "VV" dibujado como vector (ImageResponse no lee fuentes woff2). */
function V({ cx }: { cx: number }) {
  const o = (dx: number) => cx + dx;
  return (
    <>
      <polygon
        points={`${o(-22)},26 ${o(-16)},26 ${o(-1)},62 ${o(10)},26 ${o(24)},26 ${o(4)},78 ${o(-4)},78`}
      />
      <rect x={o(-27)} y={23} width={16} height={3.5} />
      <rect x={o(6)} y={23} width={23} height={3.5} />
    </>
  );
}

export function Monogram({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill={color}>
      <V cx={26} />
      <V cx={74} />
    </svg>
  );
}

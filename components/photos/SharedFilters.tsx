export function SharedFilters() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shared-paper">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="4" seed="2" />
        </filter>
        <filter id="shared-film">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" seed="5" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
    </svg>
  );
}

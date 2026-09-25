export default function Logo({ theme, className = 'brand-logo-img', alt = 'NexusChat' }) {
  // If theme is explicitly light, or system prefers light
  const isLight = theme === 'light';
  const src = isLight ? '/logo-light.jpg' : '/logo-dark.jpg';

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      key={src}
    />
  );
}

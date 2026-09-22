import React from 'react';

export default function Link({
  href,
  children,
  className,
  style,
  onClick,
  target,
  rel,
  prefetch,
  scroll,
  replace,
  shallow,
  ...props
}: any) {
  const finalHref = typeof href === 'object' ? href.pathname || '/' : href;
  return (
    <a
      href={finalHref}
      className={className}
      style={style}
      onClick={onClick}
      target={target}
      rel={rel}
      {...props}
    >
      {children}
    </a>
  );
}

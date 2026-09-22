import React from 'react';

export interface ImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | { src: string; [key: string]: any };
  alt?: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  placeholder?: string;
  blurDataURL?: string;
  unoptimized?: boolean;
}

export default function Image({
  src,
  alt = '',
  width,
  height,
  fill,
  priority,
  quality,
  sizes,
  placeholder,
  blurDataURL,
  unoptimized,
  className,
  style,
  loading,
  ...restProps
}: ImageProps) {
  const resolvedSrc = typeof src === 'object' && src !== null ? (src as any).src || '' : src;

  const combinedStyle: React.CSSProperties = {
    ...style,
    ...(fill
      ? {
          position: 'absolute',
          height: '100%',
          width: '100%',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          objectFit: (style?.objectFit as any) || 'cover',
        }
      : {}),
  };

  // Use lowercase fetchpriority to avoid React 18 DOM prop warnings
  const imgProps: any = {
    src: resolvedSrc,
    alt,
    sizes,
    loading: loading || (priority ? 'eager' : 'lazy'),
    decoding: 'async',
    className,
    style: combinedStyle,
    ...restProps,
  };

  if (!fill) {
    if (width !== undefined) imgProps.width = width;
    if (height !== undefined) imgProps.height = height;
  }

  if (priority) {
    imgProps.fetchpriority = 'high';
  }

  return <img {...imgProps} />;
}

export function getImageProps(props: any) {
  return { props };
}

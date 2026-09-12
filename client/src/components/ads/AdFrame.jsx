'use client';

import React, { useEffect, useRef, useState } from 'react';

// A successful script/iframe HTTP response can be completely empty. Report
// a load only after the frame contains a visible creative or iframe.
function hasCreative(doc) {
  if (!doc?.body) return false;
  // If Adsterra injected an iframe, img, video, link, or native container content, creative is present
  const elements = doc.body.querySelectorAll('iframe, img, video, object, embed, a[href], div[id^="container-"] > *, ins, [data-creative]');
  if (elements.length > 0) return true;
  // Also check if text content or child nodes were injected into body
  return Boolean(doc.body.childNodes?.length > 2);
}

export default function AdFrame({ title, source, width, height, onLoad, onUnavailable, responsive = false }) {
  const containerRef = useRef(null);
  const frameRef = useRef(null);
  const callbacksRef = useRef({ onLoad, onUnavailable });
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);
  callbacksRef.current = { onLoad, onUnavailable };

  useEffect(() => {
    if (responsive || !containerRef.current) return undefined;
    const updateScale = () => {
      const clientWidth = containerRef.current?.clientWidth;
      if (clientWidth && clientWidth > 0 && width > 0) {
        setScale(Math.min(1, clientWidth / width));
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [responsive, width]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    let finished = false;
    let observer;
    let doc;
    let timeout;
    const watched = new Set();
    setReady(false);

    const cleanup = () => {
      clearTimeout(timeout);
      observer?.disconnect();
      frame.removeEventListener('load', handleLoad);
      doc?.removeEventListener('load', inspect, true);
      doc?.removeEventListener('error', handleError, true);
      for (const child of watched) child.removeEventListener('load', handleChildLoad);
    };
    const finish = (loaded, reason) => {
      if (finished) return;
      finished = true;
      cleanup();
      setReady(loaded);
      if (loaded) callbacksRef.current.onLoad?.();
      else callbacksRef.current.onUnavailable?.(reason);
    };
    function handleChildLoad(event) {
      event.target.dataset.creativeLoaded = 'true';
      inspect();
    }
    function inspect() {
      if (finished) return;
      for (const child of doc?.querySelectorAll('iframe') || []) {
        if (!watched.has(child)) {
          watched.add(child);
          child.addEventListener('load', handleChildLoad);
        }
      }
      if (hasCreative(doc)) finish(true);
    }
    function handleError(event) {
      // Non-fatal: auxiliary ad tracking/beacon pixels often fail or are blocked
      // without affecting the visual banner creative. Only abort if main invoke fails.
      if (event.target?.tagName === 'SCRIPT' && event.target?.src?.includes('invoke.js')) {
        finish(false, 'script_error');
      }
    }
    function handleLoad() {
      doc = frame.contentDocument;
      if (!doc?.body) return;
      observer?.disconnect();
      for (const child of doc.querySelectorAll('iframe')) child.dataset.creativeLoaded = 'true';
      inspect();
      if (finished) return;
      clearTimeout(timeout);
      // Give ad network reasonable time to bid and inject the ad
      timeout = setTimeout(() => {
        if (hasCreative(doc)) finish(true);
        else finish(false, 'empty_or_timeout');
      }, 8000);
      observer = new MutationObserver(inspect);
      observer.observe(doc.body, { childList: true, subtree: true, attributes: true });
      doc.addEventListener('load', inspect, true);
      doc.addEventListener('error', handleError, true);
    }

    timeout = setTimeout(() => {
      if (hasCreative(frame.contentDocument)) finish(true);
      else finish(false, 'network_timeout');
    }, 8000);
    frame.addEventListener('load', handleLoad);
    if (frame.contentDocument?.readyState === 'complete') handleLoad();
    return () => { finished = true; cleanup(); };
  }, [source]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden flex items-center justify-center"
      style={{ maxWidth: responsive ? undefined : width, height: responsive ? height : height * scale }}
    >
      <iframe
        ref={frameRef}
        title={title}
        srcDoc={source}
        width={responsive ? '100%' : width}
        height={height}
        scrolling="no"
        loading="eager"
        referrerPolicy="origin"
        data-ad-state={ready ? 'loaded' : 'loading'}
        className="block border-0 bg-transparent mx-auto"
        style={{
          colorScheme: 'dark',
          transform: !responsive && scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top center'
        }}
      />
    </div>
  );
}

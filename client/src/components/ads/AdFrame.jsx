'use client';

import React, { useEffect, useRef, useState } from 'react';

// A successful script/iframe HTTP response can be completely empty. Report
// a load only after the frame contains a visible creative.
function hasCreative(document) {
  if (!document?.body) return false;
  return [...document.body.querySelectorAll('iframe, img, video, object, embed, a[href]')].some((element) => {
    const bounds = element.getBoundingClientRect();
    if (bounds.width < 30 || bounds.height < 20) return false;
    if (element.tagName === 'IMG') return element.complete && element.naturalWidth > 1;
    if (element.tagName === 'IFRAME') {
      try {
        const child = element.contentDocument;
        // A cross-origin ad document cannot be inspected. Its completed load
        // is checked by the parent's load event or the listener below.
        if (!child) return element.dataset.creativeLoaded === 'true';
        return child.readyState === 'complete' && (Boolean(child.body?.innerText.trim()) || hasCreative(child));
      } catch {
        return element.dataset.creativeLoaded === 'true';
      }
    }
    return true;
  });
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
    const updateScale = () => setScale(Math.min(1, (containerRef.current?.clientWidth || width) / width));
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
    let document;
    let timeout;
    const watched = new Set();
    setReady(false);

    const cleanup = () => {
      clearTimeout(timeout);
      observer?.disconnect();
      frame.removeEventListener('load', handleLoad);
      document?.removeEventListener('load', inspect, true);
      document?.removeEventListener('error', handleError, true);
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
      for (const child of document?.querySelectorAll('iframe') || []) {
        if (!watched.has(child)) {
          watched.add(child);
          child.addEventListener('load', handleChildLoad);
        }
      }
      if (hasCreative(document)) finish(true);
    }
    function handleError(event) {
      if (event.target?.tagName === 'SCRIPT') finish(false, 'script_error');
    }
    function handleLoad() {
      document = frame.contentDocument;
      if (!document?.body) return;
      observer?.disconnect();
      // The outer load event waits for already-inserted child frames.
      for (const child of document.querySelectorAll('iframe')) child.dataset.creativeLoaded = 'true';
      inspect();
      if (finished) return;
      clearTimeout(timeout);
      timeout = setTimeout(() => finish(false, 'empty_or_timeout'), 4000);
      observer = new MutationObserver(inspect);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      document.addEventListener('load', inspect, true);
      document.addEventListener('error', handleError, true);
    }
    // Give a script request reasonable time to respond. If no creative
    // appears within 6s, fail fast to collapse the slot cleanly without blank gaps.
    timeout = setTimeout(() => finish(false, 'network_timeout'), 6000);
    frame.addEventListener('load', handleLoad);
    // Covers a cached srcdoc that completed before effects were installed.
    if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument?.URL === 'about:srcdoc') handleLoad();
    return () => { finished = true; cleanup(); };
  }, [source]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
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
        referrerPolicy="no-referrer-when-downgrade"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
        data-ad-state={ready ? 'loaded' : 'loading'}
        className="absolute left-1/2 top-0 block border-0 bg-transparent"
        // Keep the frame visible while the provider initializes: some networks
        // wait for visibility before serving. Matching the document's scheme
        // keeps its transparent background from becoming a white rectangle.
        style={{ colorScheme: 'dark', transform: `translateX(-50%) scale(${responsive ? 1 : scale})`, transformOrigin: 'top center' }}
      />
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';

// A successful script/iframe HTTP response can be completely empty. Report
// a load only after the frame contains a visible creative or iframe.
function hasCreative(doc) {
  if (!doc?.body) return false;
  // Detect Adsterra banner/video iframes, images, and native containers
  const elements = doc.body.querySelectorAll(
    'iframe, img[src]:not([src=""]), video, object, embed, ins, [data-creative], a[href] img'
  );
  for (const el of elements) {
    if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') return true;
  }
  // Native ad container: Adsterra fills div#container-<key> with child nodes
  const containers = doc.body.querySelectorAll('div[id^="container-"]');
  for (const c of containers) {
    if (c.children.length > 0) return true;
  }
  return false;
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

    function handleMessage(event) {
      if (event.data?.type === 'AD_LOADED') {
        finish(true);
      }
    }
    window.addEventListener('message', handleMessage);

    const cleanup = () => {
      clearTimeout(timeout);
      observer?.disconnect();
      window.removeEventListener('message', handleMessage);
      frame.removeEventListener('load', handleLoad);
      doc?.removeEventListener('load', inspect, true);
      for (const child of watched) child.removeEventListener('load', handleChildLoad);
    };

    const finish = (loaded) => {
      if (finished) return;
      if (loaded) {
        finished = true;
        cleanup();
        setReady(true);
        callbacksRef.current.onLoad?.();
      }
    };

    function handleChildLoad(event) {
      event.target.dataset.creativeLoaded = 'true';
      inspect();
    }

    function inspect() {
      if (finished) return;
      try {
        const targetDoc = doc || frame.contentDocument;
        for (const child of targetDoc?.querySelectorAll('iframe') || []) {
          if (!watched.has(child)) {
            watched.add(child);
            child.addEventListener('load', handleChildLoad);
          }
        }
        if (hasCreative(targetDoc)) finish(true);
      } catch (e) {
        // Cross-origin access might be restricted on live redirect
      }
    }

    function handleLoad() {
      try {
        doc = frame.contentDocument;
      } catch (e) {
        doc = null;
      }
      if (!doc?.body) return;
      observer?.disconnect();
      for (const child of doc.querySelectorAll('iframe')) child.dataset.creativeLoaded = 'true';
      inspect();
      if (finished) return;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        inspect();
      }, 5000);
      observer = new MutationObserver(inspect);
      observer.observe(doc.body, { childList: true, subtree: true, attributes: true });
      doc.addEventListener('load', inspect, true);
    }

    const noFillTimeout = setTimeout(() => {
      if (finished) return;
      try {
        const targetDoc = doc || frame.contentDocument;
        if (!hasCreative(targetDoc)) {
          finished = true;
          cleanup();
          callbacksRef.current.onUnavailable?.('no_fill');
        }
      } catch {
        // Cross-origin redirection may indicate ad network navigation
      }
    }, 9000);

    timeout = setTimeout(() => {
      inspect();
    }, 5000);
    frame.addEventListener('load', handleLoad);
    if (frame.contentDocument?.readyState === 'complete') handleLoad();
    return () => {
      finished = true;
      clearTimeout(noFillTimeout);
      cleanup();
    };
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
        src={source}
        width={responsive ? '100%' : width}
        height={height}
        scrolling="no"
        loading="eager"
        data-ad-state={ready ? 'loaded' : 'loading'}
        className="block border-0 bg-transparent mx-auto"
        style={{
          colorScheme: 'dark',
          maxWidth: '100%',
          transformOrigin: 'top center',
          transform: responsive ? 'none' : `scale(${scale})`,
        }}
      />
    </div>
  );
}

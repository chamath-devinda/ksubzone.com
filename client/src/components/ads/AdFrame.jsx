'use client';

import React, { useEffect, useRef, useState } from 'react';

// A successful script/iframe HTTP response can be completely empty. Report
// a load only after the frame contains a visible creative or iframe.
function hasCreative(doc) {
  if (!doc?.body) return false;
  
  const isVisible = (el) => {
    if (!el) return false;
    try {
      const style = doc.defaultView?.getComputedStyle(el) || el.style;
      if (style?.display === 'none' || style?.visibility === 'hidden' || style?.opacity === '0') return false;
      const rect = el.getBoundingClientRect();
      if (rect.left < -50 || rect.top < -50) return false;
      if (rect.width >= 10 && rect.height >= 10) return true;
      if (el.tagName === 'IFRAME' && (Number(el.width) >= 10 || parseInt(el.style?.width, 10) >= 10)) return true;
      return false;
    } catch {
      return false;
    }
  };

  // Detect Adsterra banner/video iframes, images, and native containers that are actually visible
  const elements = doc.body.querySelectorAll(
    'iframe, img[src]:not([src=""]), video, object, embed, ins, [data-creative], a[href] img'
  );
  for (const el of elements) {
    if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && isVisible(el)) return true;
  }
  // Native ad container: Adsterra fills div#container-<key> with child nodes
  const containers = doc.body.querySelectorAll('div[id^="container-"]');
  for (const c of containers) {
    if (c.children.length > 0 && isVisible(c)) return true;
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
        // The delivery script can create tracking/verification iframes before
        // it creates the actual creative. Only accept the message when the
        // frame contains a visible ad, otherwise the slot becomes a false
        // positive and disappears with a blank box.
        inspect();
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
        // A cross-origin security exception means the ad network has loaded
        // external third-party creative content. Treat this as a successful load.
        finish(true);
      }
    // Do not leave a reserved blank block for a provider that returned no
    // creative. The parent slot will show its local fallback after this
    // bounded wait, while real creatives still finish immediately.
    }, 10000);

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

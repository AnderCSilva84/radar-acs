import { useEffect, useState } from 'react';

// Three static routes need only History API; ordinary anchors preserve deep links.
export function useNavigation() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  function navigate(event, destination) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (window.location.pathname === destination) return;
    window.history.pushState({}, '', destination);
    setPath(destination);
    window.scrollTo?.(0, 0);
  }
  function redirect(destination) {
    if (window.location.pathname === destination) return;
    window.history.replaceState({}, '', destination);
    setPath(destination);
  }
  return { path, navigate, redirect };
}

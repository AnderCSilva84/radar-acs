export function Icon({ name, ...props }) {
  const paths = {
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    play: <path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
    book: <><path d="M4 5h6a3 3 0 0 1 3 3v12a4 4 0 0 0-4-3H4ZM20 5h-4a3 3 0 0 0-3 3v12a4 4 0 0 1 4-3h3Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5 8a8 8 0 0 1 13-3l2 2M4 17l2 2a8 8 0 0 0 13-3" /></>
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

const paths={
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
  play:'<path d="m9 5 11 7-11 7z" fill="currentColor" stroke-linejoin="round"/>',
  map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',
  list:'<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m8 14 2 2 5-5"/>',
  clock:'<path d="M3 12a9 9 0 1 1 2.5 6.2M3 5v7h7m2-5v5l3 2"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.3 9a2.8 2.8 0 0 1 5.4 1c0 2-2.7 2-2.7 4m0 3h.01"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="m10 3-.6 2.3-2 .9-2.2-1.1-2.1 2.1 1 2.2-.8 2.1L1 12v2.5l2.3.6.9 2.1-1.1 2.1 2.1 2.1 2.2-1 2 .8.6 2.3h3l.6-2.3 2-.8 2.2 1 2.1-2.1-1-2.1.8-2.1 2.3-.6V12l-2.3-.5-.8-2.1 1-2.2-2.1-2.1-2.2 1.1-2-.9L13 3z" transform="translate(1.6 -.5) scale(.9)"/>',
  sound:'<path d="M3 9h4l5-4v14l-5-4H3zm13 0a4 4 0 0 1 0 6m2.8-8a7 7 0 0 1 0 10"/>',
  pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
  enter:'<path d="M14 5h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4M4 12h11m-4-4 4 4-4 4"/>',
  back:'<path d="m10 6-6 6 6 6m-6-6h16"/>',
  full:'<path d="M9 4H4v5m11-5h5v5m0 6v5h-5m-6 0H4v-5"/>',
  pause:'<path d="M8 5v14m8-14v14" stroke-width="3"/>',
  left:'<path d="m14 5-7 7 7 7"/>',
  right:'<path d="m10 5 7 7-7 7"/>',
  up:'<path d="m5 14 7-7 7 7"/>',
  down:'<path d="m5 10 7 7 7-7"/>',
  person:'<circle cx="12" cy="5" r="2.5"/><path d="m5 12 7-3 7 3m-7-3v7m0 0-4 5m4-5 4 5"/>',
  cross:'<rect x="5" y="2" width="14" height="20" rx="4"/><circle cx="12" cy="7" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="17" r="1.5"/>',
  milk:'<path d="m7 7 3-5h7v5l2 4v10H6V11zm0 0h10m-11 4h13m-5-4v14"/>',
  store:'<path d="M4 10v11h16V10M3 10l2-6h14l2 6c0 2-4 3-4 0 0 3-5 3-5 0 0 3-5 3-5 0 0 3-4 2-4 0zM9 21v-6h6v6"/>',
  card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  bag:'<path d="m4 8 1 13h14l1-13zM8 9V6a4 4 0 0 1 8 0v3"/>',
  eye:'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  star:'<path d="m12 2 3 6 7 1-5 5 1 7-6-3.3L6 21l1-7-5-5 7-1z"/>',
  screen:'<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M12 17v4m-4 0h8"/>',
  touch:'<path d="M9 13V6a2 2 0 1 1 4 0v5l4-1c2 0 3 1 3 3l-1 6-2 2h-6l-5-6c-1-2 1-3 3-2zM5 8a7 7 0 0 1 1-5m11 0a7 7 0 0 1 1 5"/>'
}
export function icon(id,size=22){
  return '<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+(paths[id]??paths.pin)+'</svg>'
}


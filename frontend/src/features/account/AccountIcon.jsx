import React from 'react';

const paths = {
  person: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2 M16 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  email: 'M3 5h18v14H3z M3 5l9 7 9-7',
  home: 'M3 11l9-8 9 8 M5 9v12h14V9 M9 21v-8h6v8',
  citizenship: 'M4 3h16v18H4z M8 8h8 M8 12h8 M8 16h4',
  needs: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  interests: 'M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  password: 'M8 11V7a4 4 0 0 1 8 0v4 M5 11h14v10H5z M12 15v2',
  authenticator: 'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6',
  recovery: 'M5 3h14v18H5z M8 7h1 M12 7h4 M8 12h1 M12 12h4 M8 17h1 M12 17h4',
  light: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 1v2 M12 21v2 M1 12h2 M21 12h2 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2',
  dark: 'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10',
  brand: 'M12 2v20 M2 12h20 M5 5l14 14 M5 19L19 5',
  chevron: 'M9 5l7 7-7 7',
  error: 'M12 3L2 21h20z M12 9v5 M12 17v1',
};

export function AccountIcon({ name }) {
  return <svg className="account-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name === 'name' ? 'person' : name] || paths.person} /></svg>;
}

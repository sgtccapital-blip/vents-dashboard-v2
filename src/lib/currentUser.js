import { createContext, useContext } from 'react';

/** Usuario con sesión iniciada (GG, MARIO…), el equipo y logout. Lo provee AuthGate. */
export const CurrentUserContext = createContext({ user: null, team: [], logout: () => {} });

export const useCurrentUser = () => useContext(CurrentUserContext);

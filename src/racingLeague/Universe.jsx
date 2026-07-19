import { useCallback, useEffect, useState } from 'react';
import Hub from './Hub';
import SolarisLeague from './solaris/SolarisLeague';
import HorizonLeague from './horizon/HorizonLeague';
import RidgelineLeague from './ridgeline/RidgelineLeague';
import ChampionsLeague from './championsLeague/ChampionsLeague';
import WorldCup from './worldCup/WorldCup';
import { leagueById, crossLeagueById } from './universeData';

const ROUTE_COMPONENTS = {
  solaris: SolarisLeague,
  horizon: HorizonLeague,
  ridgeline: RidgelineLeague,
  championsLeague: ChampionsLeague,
  worldCup: WorldCup,
};

const BASE = '/racing-league';

function routeFromPath(pathname) {
  const rest = pathname.slice(BASE.length).replace(/^\/+/, '').split('/')[0];
  return rest && (leagueById[rest] || crossLeagueById[rest]) ? rest : null;
}

function Universe() {
  const [routeId, setRouteId] = useState(() => routeFromPath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRouteId(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = useCallback((id) => {
    const url = id ? `${BASE}/${id}` : BASE;
    window.history.pushState(null, '', url);
    setRouteId(id);
    window.scrollTo(0, 0);
  }, []);

  const goHome = useCallback(() => navigateTo(null), [navigateTo]);

  if (routeId) {
    const RouteComponent = ROUTE_COMPONENTS[routeId];
    return <RouteComponent onBack={goHome} />;
  }

  return <Hub onSelectLeague={navigateTo} />;
}

export default Universe;

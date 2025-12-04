import { useContext } from 'react';
import { SiteContext } from '../context/SiteContext';

export const useSiteContext = () => useContext(SiteContext);

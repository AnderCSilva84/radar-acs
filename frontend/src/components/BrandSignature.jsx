import { COVER_ASSETS } from '../services/covers';

export function BrandSignature({ prominent = false, decorative = false }) {
  return <img className={'brand-signature ' + (prominent ? 'prominent' : 'discreet')}
    src={COVER_ASSETS.logo} alt={decorative ? '' : 'ACS Informática'}
    loading="lazy" decoding="async" width="590" height="297" />;
}

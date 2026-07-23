import next from 'eslint-config-next';
import base from '../../eslint.config.base.mjs';

// eslint-config-next v16 default-exports a flat-config array (not a function).
const config = [...base, ...next];

export default config;

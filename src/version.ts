import pkg from '../package.json' with { type: 'json' };

/** Version of the a2ui-term package. */
export const VERSION: string = pkg.version;

export const DESCRIPTION: string = pkg.description;

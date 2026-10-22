/** Process-wide settings shared by index.ts and auth.ts. */

export const PRODUCTION = process.argv.includes('--production');

/**
 * Interface the server binds to. Loopback by default: the admin API should not
 * be reachable from the network unless the owner says so (HOST=0.0.0.0, or a
 * reverse proxy on the same machine).
 */
export const HOST = process.env.HOST?.trim() || '127.0.0.1';

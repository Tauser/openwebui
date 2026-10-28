import { hostname, networkInterfaces } from 'node:os';
import { isIP } from 'node:net';

function privateAddress(address: string): boolean {
    if (isIP(address) === 4) {
        const [a, b] = address.split('.').map(Number);
        return a === 10 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 169 && b === 254;
    }
    if (isIP(address) === 6) return /^(fc|fd|fe[89ab])/i.test(address);
    return false;
}
function normalizeHostname(host: string): string | undefined {
    try {
        const formatted = isIP(host) === 6 ? `[${host}]` : host;
        const url = new URL(`http://${formatted}`);
        if (url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) return undefined;
        return url.hostname.toLowerCase();
    } catch { return undefined; }
}
export function localHostnames(machineName = hostname(), addresses = Object.values(networkInterfaces()).flatMap(entries => entries ?? []).map(entry => entry.address)): Set<string> {
    const hosts = new Set(['localhost', '127.0.0.1', '[::1]']);
    const name = normalizeHostname(machineName);
    if (name) hosts.add(name);
    for (const address of addresses) {
        if (!privateAddress(address)) continue;
        const normalized = normalizeHostname(address);
        if (normalized) hosts.add(normalized);
    }
    return hosts;
}
export function validBindHost(host: string, addresses = Object.values(networkInterfaces()).flatMap(entries => entries ?? []).map(entry => entry.address)): boolean {
    return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(host) || privateAddress(host) && addresses.includes(host);
}
function parseHost(host: string): URL | undefined {
    if (!host || /[\s/@?#\\]/.test(host)) return undefined;
    try {
        const url = new URL(`http://${host}`);
        if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return undefined;
        return url;
    } catch { return undefined; }
}
export function allowedRequest(host: string, origin: string | undefined, allowedHosts: Set<string>): boolean {
    const target = parseHost(host);
    if (!target || !allowedHosts.has(target.hostname.toLowerCase())) return false;
    if (!origin) return true;
    try {
        const source = new URL(origin);
        if (source.protocol !== 'http:' || source.username || source.password || source.origin !== origin) return false;
        if (source.host.toLowerCase() === target.host.toLowerCase()) return true;
        return ['localhost', '127.0.0.1', '[::1]'].includes(source.hostname) && source.port === '5173';
    } catch { return false; }
}

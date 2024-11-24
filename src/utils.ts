export function cleanVersion(version: string): string | null {
    // Match a version string of the format x.x.x where x is any number
    const match = version.match(/\d+\.\d+\.\d+/);
    return match ? match[0] : null; // Return the first match or null if no match
}
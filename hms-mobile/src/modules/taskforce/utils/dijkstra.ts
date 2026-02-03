export interface Node {
    id: string;
    latitude: number;
    longitude: number;
}

export interface Edge {
    from: string;
    to: string;
    weight: number;
}

export function haversineDistance(node1: { latitude: number; longitude: number }, node2: { latitude: number; longitude: number }) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(node2.latitude - node1.latitude);
    const dLon = toRad(node2.longitude - node1.longitude);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(node1.latitude)) * Math.cos(toRad(node2.latitude)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function dijkstra(nodes: Node[], edges: Edge[], startNodeId: string) {
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const unvisited = new Set<string>();

    nodes.forEach((node) => {
        distances[node.id] = Infinity;
        previous[node.id] = null;
        unvisited.add(node.id);
    });

    distances[startNodeId] = 0;

    while (unvisited.size > 0) {
        let currentNodeId: string | null = null;
        let shortestDistance = Infinity;

        unvisited.forEach((nodeId) => {
            if (distances[nodeId] < shortestDistance) {
                shortestDistance = distances[nodeId];
                currentNodeId = nodeId;
            }
        });

        if (currentNodeId === null || shortestDistance === Infinity) break;

        unvisited.delete(currentNodeId);

        const neighbors = edges.filter((edge) => edge.from === currentNodeId);
        for (const neighbor of neighbors) {
            if (!unvisited.has(neighbor.to)) continue;

            const alt = distances[currentNodeId] + neighbor.weight;
            if (alt < distances[neighbor.to]) {
                distances[neighbor.to] = alt;
                previous[neighbor.to] = currentNodeId;
            }
        }
    }

    return { distances, previous };
}

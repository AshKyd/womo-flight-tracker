/**
 * Interpolates coordinates along a GeoJSON line, ensuring that no two
 * consecutive points in the resulting array are further apart than a
 * specified minimum distance.
 *
 * @param {Array<Array<number>>} coords An array of GeoJSON coordinates (e.g., [[lng, lat], [lng, lat], ...]).
 * @param {number} minDistance The maximum allowed distance between any two consecutive points in the output array.
 * This distance is calculated using a simple Euclidean distance in the coordinate system.
 * @returns {Array<Array<number>>} A new array of interpolated coordinates.
 */
export function interpolateCoordinates(coords, minDistance) {
  // Handle edge cases: null, empty, or single-point arrays
  if (!coords || coords.length < 2) {
    return coords;
  }

  const interpolated = [];
  // Start with the first point from the original array
  interpolated.push(coords[0]);

  // Iterate through each segment of the original line
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i]; // Current start point of the segment
    const p2 = coords[i + 1]; // Current end point of the segment

    // Calculate the Euclidean distance between p1 and p2
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const segmentDistance = Math.sqrt(dx * dx + dy * dy);

    // If the segment is longer than the minimum distance, interpolate
    if (segmentDistance > minDistance) {
      // Determine how many intervals are needed to ensure each sub-segment
      // is less than or equal to minDistance.
      // Math.ceil ensures we have enough divisions.
      const numIntervals = Math.ceil(segmentDistance / minDistance);

      // Calculate the step size for longitude and latitude for each interval
      const stepX = dx / numIntervals;
      const stepY = dy / numIntervals;

      // Add intermediate points
      // We start from j=1 because j=0 would be p1 (already added or will be added as p1 of next segment)
      // and go up to numIntervals-1 because the last point (p2) will be added explicitly after this loop.
      for (let j = 1; j < numIntervals; j++) {
        const interpolatedX = p1[0] + j * stepX;
        const interpolatedY = p1[1] + j * stepY;
        interpolated.push([interpolatedX, interpolatedY]);
      }
    }

    // Always add the end point of the current segment.
    // This ensures all original points are preserved in the output.
    interpolated.push(p2);
  }

  return interpolated;
}

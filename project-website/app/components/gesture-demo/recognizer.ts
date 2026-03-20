export type GestureName =
  | "sign_a"
  | "sign_b"
  | "sign_c"
  | "sign_d"
  | "thumbs_up"
  | "unknown";

export type DemoLetter = "A" | "B" | "C" | "D";
export type DemoState = "idle" | "pending" | "active";

export type LandmarkPoint = {
  x: number;
  y: number;
};

export type GestureTemplate = {
  handedness: "Left" | "Right";
  name: Exclude<GestureName, "unknown">;
  normalizedPoints: ReadonlyArray<readonly [number, number]>;
};

export type StateMachineResult = {
  activeCommand: Extract<GestureName, `sign_${string}`> | null;
  pendingCommand: Extract<GestureName, `sign_${string}`> | null;
  state: DemoState;
};

const MATCH_THRESHOLD = 0.35;
const TIMEOUT_FRAMES = 30;
const UNKNOWN_GESTURE: GestureName = "unknown";

export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

function normalizePoints(points: ReadonlyArray<readonly [number, number]>) {
  if (!points.length) {
    return [];
  }

  const centerX = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const centerY = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  const centered = points.map(([x, y]) => [x - centerX, y - centerY] as const);

  const scale = Math.max(
    centered.reduce((largest, [x, y]) => Math.max(largest, Math.hypot(x, y)), 0),
    1e-6,
  );

  return centered.map(([x, y]) => [x / scale, y / scale] as const);
}

function distance(
  pointsA: ReadonlyArray<readonly [number, number]>,
  pointsB: ReadonlyArray<readonly [number, number]>,
) {
  let pointDistance = 0;
  let centerDistance = 0;

  for (let index = 0; index < pointsA.length; index += 1) {
    const pointA = pointsA[index];
    const pointB = pointsB[index];

    const dx = pointA[0] - pointB[0];
    const dy = pointA[1] - pointB[1];
    pointDistance += Math.hypot(dx, dy);

    const radiusA = Math.hypot(pointA[0], pointA[1]);
    const radiusB = Math.hypot(pointB[0], pointB[1]);
    centerDistance += Math.abs(radiusA - radiusB);
  }

  pointDistance /= pointsA.length;
  centerDistance /= pointsA.length;

  return (0.7 * pointDistance) + (0.3 * centerDistance);
}

function mirrored(points: ReadonlyArray<readonly [number, number]>) {
  return points.map(([x, y]) => [-x, y] as const);
}

function isSignGesture(name: GestureName): name is Extract<GestureName, `sign_${string}`> {
  return name.startsWith("sign_");
}

export function gestureToLetter(gesture: GestureName | null): DemoLetter | null {
  switch (gesture) {
    case "sign_a":
      return "A";
    case "sign_b":
      return "B";
    case "sign_c":
      return "C";
    case "sign_d":
      return "D";
    default:
      return null;
  }
}

export function gestureLabel(gesture: GestureName | null) {
  if (gesture === "thumbs_up") {
    return "Thumbs up";
  }

  const letter = gestureToLetter(gesture);
  return letter ?? "No sign";
}

export function recognizeGesture(
  landmarks: ReadonlyArray<LandmarkPoint>,
  handedness: string,
  templates: ReadonlyArray<GestureTemplate>,
): [GestureName, number] {
  if (landmarks.length !== 21 || !templates.length) {
    return [UNKNOWN_GESTURE, 0];
  }

  const normalizedPoints = normalizePoints(landmarks.map(({ x, y }) => [x, y] as const));
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestName: GestureName = UNKNOWN_GESTURE;

  for (const template of templates) {
    if (template.normalizedPoints.length !== normalizedPoints.length) {
      continue;
    }

    let currentDistance = distance(normalizedPoints, template.normalizedPoints);

    if (template.handedness && template.handedness !== handedness) {
      const mirroredDistance = distance(mirrored(normalizedPoints), template.normalizedPoints);
      currentDistance = Math.min(currentDistance + 0.05, mirroredDistance);
    }

    if (currentDistance < bestDistance) {
      bestDistance = currentDistance;
      bestName = template.name;
    }
  }

  if (bestDistance > MATCH_THRESHOLD) {
    return [UNKNOWN_GESTURE, 0];
  }

  return [bestName, Math.max(0, 1 - (bestDistance / MATCH_THRESHOLD))];
}

export class GestureSmoother {
  private readonly labels: GestureName[] = [];

  constructor(
    private readonly windowSize = 5,
    private readonly minVotes = 3,
  ) {}

  update(label: GestureName) {
    this.labels.push(label);
    if (this.labels.length > this.windowSize) {
      this.labels.shift();
    }

    const voteCounts = new Map<GestureName, number>();
    for (const item of this.labels) {
      if (item === UNKNOWN_GESTURE) {
        continue;
      }

      voteCounts.set(item, (voteCounts.get(item) ?? 0) + 1);
    }

    let bestLabel: GestureName = UNKNOWN_GESTURE;
    let bestCount = 0;
    for (const [labelName, count] of voteCounts) {
      if (count > bestCount) {
        bestLabel = labelName;
        bestCount = count;
      }
    }

    return bestCount >= this.minVotes ? bestLabel : UNKNOWN_GESTURE;
  }
}

export class GestureStateMachine {
  private activeGesture: Extract<GestureName, `sign_${string}`> | null = null;
  private pendingGesture: Extract<GestureName, `sign_${string}`> | null = null;
  private state: DemoState = "idle";
  private unknownCount = 0;

  update(gesture: GestureName): StateMachineResult {
    if (this.state === "idle") {
      if (isSignGesture(gesture)) {
        this.state = "pending";
        this.pendingGesture = gesture;
        this.unknownCount = 0;
      }
    } else if (this.state === "pending") {
      if (gesture === "thumbs_up") {
        this.state = "active";
        this.activeGesture = this.pendingGesture;
        this.pendingGesture = null;
        this.unknownCount = 0;
      } else if (isSignGesture(gesture) && gesture !== this.pendingGesture) {
        this.pendingGesture = gesture;
        this.unknownCount = 0;
      } else if (gesture === UNKNOWN_GESTURE) {
        this.unknownCount += 1;
        if (this.unknownCount >= TIMEOUT_FRAMES) {
          this.state = this.activeGesture ? "active" : "idle";
          this.pendingGesture = null;
          this.unknownCount = 0;
        }
      } else {
        this.unknownCount = 0;
      }
    } else if (this.state === "active") {
      if (isSignGesture(gesture) && gesture !== this.activeGesture) {
        this.state = "pending";
        this.pendingGesture = gesture;
        this.unknownCount = 0;
      }
    }

    return {
      activeCommand: this.activeGesture,
      pendingCommand: this.pendingGesture,
      state: this.state,
    };
  }
}

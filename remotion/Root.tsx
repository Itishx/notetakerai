import { Composition } from "remotion";
import { BrainoLaunch, DURATION_IN_FRAMES, FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from "./BrainoLaunch";

export function Root() {
  return (
    <Composition
      id="BrainoLaunch"
      component={BrainoLaunch}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
  );
}

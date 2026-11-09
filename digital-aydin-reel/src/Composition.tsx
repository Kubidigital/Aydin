import React from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Montserrat";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "500", "700", "800"],
  subsets: ["latin"],
});

// Palette Digital Aydin
const IMPERIAL = "#0B2A8A"; // bleu impérial
const IMPERIAL_DEEP = "#040F33";
const BORDEAUX = "#7A1430";
const BORDEAUX_LIGHT = "#A8243F";
const WHITE = "#FFFFFF";

const FPS = 30;
const T = 12; // durée des transitions (frames)
const S1 = 105;
const S2 = 110;
const S3 = 110;
const S4 = 161;
export const TOTAL = S1 + S2 + S3 + S4 - 3 * T; // 450 = 15 s

const ease = Easing.bezier(0.22, 1, 0.36, 1);

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, TOTAL], [0, 1]);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 90% 60% at ${30 + drift * 20}% 18%, ${IMPERIAL} 0%, transparent 70%),
          radial-gradient(ellipse 80% 50% at ${80 - drift * 15}% 95%, ${BORDEAUX}99 0%, transparent 65%),
          linear-gradient(180deg, #071A5E 0%, ${IMPERIAL_DEEP} 100%)`,
      }}
    />
  );
};

const AccentLine: React.FC<{ delay?: number; width?: number }> = ({
  delay = 0,
  width = 220,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return (
    <div
      style={{
        width: width * p,
        height: 6,
        borderRadius: 3,
        background: `linear-gradient(90deg, ${BORDEAUX_LIGHT}, ${BORDEAUX})`,
      }}
    />
  );
};

const LogoCard: React.FC<{ size: number; zoomFrom?: number; zoomTo?: number; duration: number }> = ({
  size,
  zoomFrom = 1.0,
  zoomTo = 1.08,
  duration,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const zoom = interpolate(frame, [0, duration], [zoomFrom, zoomTo]);
  const y = interpolate(enter, [0, 1], [60, 0]);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 48,
        overflow: "hidden",
        opacity: enter,
        transform: `translateY(${y}px)`,
        boxShadow: `0 40px 120px rgba(0,0,0,0.55), 0 0 0 2px ${BORDEAUX_LIGHT}66`,
      }}
    >
      <Img
        src={staticFile("logo.jpg")}
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }}
      />
    </div>
  );
};

const TextReveal: React.FC<{
  children: React.ReactNode;
  delay: number;
  size: number;
  weight?: number;
  color?: string;
}> = ({ children, delay, size, weight = 700, color = WHITE }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return (
    <div
      style={{
        fontFamily,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1.12,
        letterSpacing: "-0.01em",
        textAlign: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * 30}px)`,
      }}
    >
      {children}
    </div>
  );
};

const Intro: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 70 }}>
    <LogoCard size={720} zoomFrom={1.12} zoomTo={1.0} duration={S1} />
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
      <TextReveal delay={20} size={92} weight={800}>
        DIGITAL AYDIN
      </TextReveal>
      <AccentLine delay={32} width={200} />
      <TextReveal delay={40} size={40} weight={300} color="#C9D3F5">
        Création de sites &amp; référencement
      </TextReveal>
    </div>
  </AbsoluteFill>
);

const Feature: React.FC<{ kicker: string; title: React.ReactNode; duration: number }> = ({
  kicker,
  title,
  duration,
}) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 80, padding: "0 90px" }}>
    <LogoCard size={560} duration={duration} />
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <TextReveal delay={10} size={34} weight={500} color={BORDEAUX_LIGHT}>
        <span style={{ letterSpacing: "0.3em", color: "#E3A6B4" }}>{kicker}</span>
      </TextReveal>
      <TextReveal delay={16} size={88} weight={800}>
        {title}
      </TextReveal>
      <AccentLine delay={28} width={160} />
    </div>
  </AbsoluteFill>
);

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame: frame - 70, fps, config: { damping: 200 }, durationInFrames: 30 });
  const fadeOut = interpolate(frame, [S4 - 12, S4], [1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", gap: 60, padding: "0 90px", opacity: fadeOut }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <TextReveal delay={8} size={112} weight={800}>
          Votre site
        </TextReveal>
        <TextReveal delay={20} size={112} weight={800}>
          mérite d’être
        </TextReveal>
        <TextReveal delay={32} size={112} weight={800} color={WHITE}>
          <span
            style={{
              background: `linear-gradient(90deg, ${BORDEAUX_LIGHT}, #D9506E)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            trouvé.
          </span>
        </TextReveal>
      </div>
      <AccentLine delay={50} width={240} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 30,
          marginTop: 40,
          opacity: logoIn,
          transform: `translateY(${(1 - logoIn) * 30}px)`,
        }}
      >
        <div style={{ width: 130, height: 130, borderRadius: 28, overflow: "hidden", boxShadow: `0 0 0 2px ${BORDEAUX_LIGHT}66` }}>
          <Img src={staticFile("logo.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ fontFamily, fontSize: 52, fontWeight: 700, color: WHITE, letterSpacing: "0.04em" }}>
          Digital Aydin
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Reel: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: IMPERIAL_DEEP }}>
    <Background />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={S1}>
        <Intro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
      <TransitionSeries.Sequence durationInFrames={S2}>
        <Feature kicker="DESIGN" title={<>Un site qui inspire<br />confiance</>} duration={S2} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: T })}
      />
      <TransitionSeries.Sequence durationInFrames={S3}>
        <Feature kicker="RÉFÉRENCEMENT" title={<>Pensé pour<br />Google</>} duration={S3} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
      <TransitionSeries.Sequence durationInFrames={S4}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

export const MyComposition = () => {
  return (
    <Composition
      id="DigitalAydinReel"
      component={Reel}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};

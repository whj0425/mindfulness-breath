import type { CSSProperties } from "react";

import type { Mode, PhaseKey } from "../types";

type BreathRingProps = {
	gradient: Mode["gradient"];
	phaseKey: PhaseKey;
	phaseElapsed: number;
	phaseDuration: number;
};

export function BreathRing({
	gradient,
	phaseKey,
	phaseElapsed,
	phaseDuration,
}: BreathRingProps) {
	const ratio =
		phaseDuration > 0
			? Math.min(1, Math.max(0, phaseElapsed / phaseDuration))
			: 0;

	let scale = 1;
	let glowIntensity = 1;

	if (phaseKey === "inhale") {
		scale = 0.52 + easeInOutCubic(ratio) * 0.48;
		glowIntensity = 0.4 + easeInOutCubic(ratio) * 0.6;
	} else if (phaseKey === "exhale") {
		scale = 1 - easeInOutCubic(ratio) * 0.48;
		glowIntensity = 1 - easeInOutCubic(ratio) * 0.6;
	} else if (phaseKey === "hold1") {
		scale = 1;
		glowIntensity = 1;
	} else if (phaseKey === "hold2") {
		scale = 0.52;
		glowIntensity = 0.4;
	}

	const { primary, secondary } = getGradientColors(gradient);

	const ballStyle: CSSProperties = {
		transform: `scale(${scale})`,
		background: `radial-gradient(circle at 35% 35%, ${primary}, ${secondary} 60%, ${getDarkColor(gradient)} 90%)`,
		boxShadow: `
			0 0 ${50 * glowIntensity}px ${getGlowColor(gradient, 0.8 * glowIntensity)},
			0 0 ${100 * glowIntensity}px ${getGlowColor(gradient, 0.5 * glowIntensity)},
			0 0 ${160 * glowIntensity}px ${getGlowColor(gradient, 0.3 * glowIntensity)},
			inset 0 -40px 80px ${getGlowColor(gradient, 0.2)}
		`,
		transition:
			phaseKey === "hold1" || phaseKey === "hold2"
				? "transform 0.3s ease, box-shadow 0.3s ease"
				: "none",
	};

	return (
		<div className="relative grid place-items-center -mt-12">
			<div className="relative aspect-square w-[clamp(320px,34vw,620px)]">
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div className="breath-ball" style={ballStyle} />
				</div>
			</div>
			<style jsx>{`
				.breath-ball {
					width: 400px;
					height: 400px;
					border-radius: 50%;
					will-change: transform;
				}
			`}</style>
		</div>
	);
}

function getGradientColors(gradient: Mode["gradient"]): {
	primary: string;
	secondary: string;
} {
	if (gradient.includes("violet")) {
		return { primary: "#a5b4fc", secondary: "#818cf8" };
	}
	if (gradient.includes("sky")) {
		return { primary: "#7dd3fc", secondary: "#6366f1" };
	}
	if (gradient.includes("rose")) {
		return { primary: "#86b5d9", secondary: "#5a8fb8" };
	}
	return { primary: "#5eead4", secondary: "#14b8a6" };
}

function getDarkColor(gradient: Mode["gradient"]): string {
	if (gradient.includes("violet")) {
		return "#6366f1";
	}
	if (gradient.includes("sky")) {
		return "#4338ca";
	}
	if (gradient.includes("rose")) {
		return "#3b6d8f";
	}
	return "#0f766e";
}

function getGlowColor(gradient: Mode["gradient"], opacity = 0.6): string {
	if (gradient.includes("violet")) {
		return `rgba(165, 180, 252, ${opacity})`;
	}
	if (gradient.includes("sky")) {
		return `rgba(96, 165, 250, ${opacity})`;
	}
	if (gradient.includes("rose")) {
		return `rgba(134, 181, 217, ${opacity})`;
	}
	return `rgba(94, 234, 212, ${opacity})`;
}

function easeInOutCubic(t: number): number {
	const clamped = Math.min(1, Math.max(0, t));
	return clamped < 0.5
		? 4 * clamped * clamped * clamped
		: 1 - (-2 * clamped + 2) ** 3 / 2;
}

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
	if (phaseKey === "inhale") {
		scale = 0.52 + easeInOutCubic(ratio) * 0.48;
	} else if (phaseKey === "exhale") {
		scale = 1 - easeInOutCubic(ratio) * 0.48;
	} else if (phaseKey === "hold1") {
		scale = 1;
	} else if (phaseKey === "hold2") {
		scale = 0.52;
	}

	const ballStyle: CSSProperties = {
		transform: `scale(${scale})`,
		background: `linear-gradient(135deg, ${getGradientStyle(gradient)})`,
		boxShadow: `0 0 60px ${getGlowColor(gradient)}, 0 0 120px ${getGlowColor(gradient, 0.3)}`,
		transition:
			phaseKey === "hold1" || phaseKey === "hold2"
				? "transform 0.3s ease"
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

function getGradientStyle(gradient: Mode["gradient"]): string {
	if (gradient.includes("violet")) {
		return "#c4b5fd, #f472b6";
	}
	if (gradient.includes("sky")) {
		return "#60a5fa, #6366f1";
	}
	if (gradient.includes("rose")) {
		return "#fb7185, #f97316";
	}
	return "#38bdf8, #34d399";
}

function getGlowColor(gradient: Mode["gradient"], opacity = 0.6): string {
	if (gradient.includes("violet")) {
		return `rgba(196, 181, 253, ${opacity})`;
	}
	if (gradient.includes("sky")) {
		return `rgba(96, 165, 250, ${opacity})`;
	}
	if (gradient.includes("rose")) {
		return `rgba(251, 113, 133, ${opacity})`;
	}
	return `rgba(56, 189, 248, ${opacity})`;
}

function easeInOutCubic(t: number): number {
	const clamped = Math.min(1, Math.max(0, t));
	return clamped < 0.5
		? 4 * clamped * clamped * clamped
		: 1 - (-2 * clamped + 2) ** 3 / 2;
}

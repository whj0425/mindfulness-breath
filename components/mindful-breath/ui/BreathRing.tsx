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
			: phaseKey === "hold2"
			? 0
			: 1;

	const eased = easeOutQuint(ratio);
	const angle = eased * 360;

	const { primary, secondary } = getGradientColors(gradient);

	const ringStyle: CSSProperties = {
		background: `conic-gradient(from -90deg, ${hexToRgba(
			primary,
			0.6,
		)} ${angle}deg, rgba(255,255,255,0.08) ${angle}deg 360deg)`,
		boxShadow: `0 25px 65px ${hexToRgba(secondary, 0.25)}`,
	};

	const innerStyle: CSSProperties = {
		background: `radial-gradient(circle at 40% 35%, rgba(255,255,255,0.5), rgba(15,23,42,0.55))`,
	};

	return (
		<div className="relative grid place-items-center">
			<div className="relative aspect-square w-[clamp(420px,45vw,820px)]">
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div className="breath-ring" style={ringStyle}>
						<div className="breath-ring__inner" style={innerStyle} />
					</div>
				</div>
			</div>
			<style jsx>{`
				.breath-ring {
					height: 64%;
					width: 64%;
					border-radius: 9999px;
					padding: 6%;
					transition: background 0.5s ease;
					background-clip: padding-box;
					display: flex;
					align-items: center;
					justify-content: center;
					position: relative;
				}
				.breath-ring::before {
					content: "";
					position: absolute;
					inset: 0;
					border-radius: 9999px;
					border: 1px solid rgba(255, 255, 255, 0.06);
				}
				.breath-ring__inner {
					height: 100%;
					width: 100%;
					border-radius: 9999px;
					box-shadow:
						inset 0 18px 45px rgba(255, 255, 255, 0.18),
						inset 0 -28px 60px rgba(15, 23, 42, 0.35);
				}
			`}</style>
		</div>
	);
}

function getGradientColors(gradient: Mode["gradient"]): {
	primary: string;
	secondary: string;
} {
	let primary = "#38bdf8";
	let secondary = "#34d399";
	if (gradient.includes("violet")) {
		primary = "#c4b5fd";
		secondary = "#f472b6";
	} else if (gradient.includes("sky")) {
		primary = "#60a5fa";
		secondary = "#6366f1";
	} else if (gradient.includes("rose")) {
		primary = "#fb7185";
		secondary = "#f97316";
	}
	return { primary, secondary };
}

function hexToRgba(hex: string, alpha: number): string {
	const normalized = hex.replace("#", "");
	const bigint = Number.parseInt(normalized, 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function easeOutQuint(t: number): number {
	const clamped = Math.min(1, Math.max(0, t));
	const inv = 1 - clamped;
	return 1 - inv * inv * inv * inv * inv;
}

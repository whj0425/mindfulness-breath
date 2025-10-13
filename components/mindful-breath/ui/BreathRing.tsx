import type { Mode, PhaseKey } from "../types";

type BreathRingProps = {
	gradient: Mode["gradient"];
	phase: string;
	progress: number;
	phaseKey: PhaseKey;
	phaseElapsed: number;
	phaseDuration: number;
};

export function BreathRing({
	gradient,
	phase,
	progress,
	phaseKey,
	phaseElapsed,
	phaseDuration,
}: BreathRingProps) {
	const r = 42;
	const circumference = 2 * Math.PI * r;
	const dash = circumference;
	const offset = (1 - progress) * dash;
	const isHold = phaseKey === "hold1" || phaseKey === "hold2";
	const holdProgress =
		phaseDuration > 0
			? Math.min(1, Math.max(0, phaseElapsed / phaseDuration))
			: 0;
	const holdRadius = r - 6;
	const holdCircumference = 2 * Math.PI * holdRadius;
	const holdDash = holdCircumference;
	const holdOffset = (1 - holdProgress) * holdDash;
	const holdRemaining =
		isHold && phaseDuration > 0
			? Math.max(0, Math.ceil(phaseDuration - phaseElapsed))
			: null;

	return (
		<div className="relative grid place-items-center">
			<div className="absolute -inset-10 -z-10 rounded-[36px] bg-gradient-to-br from-white/10 to-white/5 blur-3xl" />
			<div className="relative aspect-square w-[min(70vh,600px)] max-w-[560px]">
				<svg viewBox="0 0 100 100" className="h-full w-full text-white" aria-hidden>
					<defs>
						<linearGradient id="ring" x1="0" x2="1" y1="0" y2="1">
							<stop offset="0%" stopColor="currentColor" />
							<stop offset="100%" stopColor="currentColor" />
						</linearGradient>
					</defs>
					<circle
						cx="50"
						cy="50"
						r={r}
						stroke="rgba(255,255,255,0.12)"
						strokeWidth="6"
						fill="none"
					/>
					<circle
						cx="50"
						cy="50"
						r={r}
						strokeWidth="6"
						stroke="url(#ring)"
						fill="none"
						strokeLinecap="round"
						strokeDasharray={dash}
						strokeDashoffset={offset}
					/>
					{isHold && phaseDuration > 0 ? (
						<circle
							cx="50"
							cy="50"
							r={holdRadius}
							strokeWidth="4"
							stroke="rgba(255,255,255,0.45)"
							fill="none"
							strokeLinecap="round"
							strokeDasharray={holdDash}
							strokeDashoffset={holdOffset}
						/>
					) : null}
				</svg>
				<div className="pointer-events-none absolute inset-0 grid place-items-center">
					<div className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10 backdrop-blur">
						<span>{phase}</span>
						{holdRemaining != null ? (
							<span className="tabular-nums text-[0.7rem] text-slate-100/80">
								{holdRemaining}s
							</span>
						) : null}
					</div>
				</div>
			</div>
			<style jsx>{`
				#ring stop:first-child {
					stop-color: var(--g1);
				}
				#ring stop:last-child {
					stop-color: var(--g2);
				}
			`}</style>
			<GradientVars gradient={gradient} />
		</div>
	);
}

function GradientVars({ gradient }: { gradient: Mode["gradient"] }) {
	let g1 = "#22d3ee";
	let g2 = "#10b981";
	if (gradient.includes("violet")) {
		g1 = "#a78bfa";
		g2 = "#e879f9";
	}
	if (gradient.includes("sky")) {
		g1 = "#38bdf8";
		g2 = "#6366f1";
	}
	if (gradient.includes("rose")) {
		g1 = "#fb7185";
		g2 = "#f97316";
	}
	return <style jsx>{`:root { --g1: ${g1}; --g2: ${g2}; }`}</style>;
}

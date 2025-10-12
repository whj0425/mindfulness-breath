"use client";

import { useEffect, useMemo, useRef, useState, type SVGProps } from "react";

const MODES = [
	{
		key: "equal",
		name: "Even Flow (5-5)",
		note: "Cultivate a gentle balance",
		gradient: "from-cyan-400 to-emerald-500",
		phases: { inhale: 5, hold1: 0, exhale: 5, hold2: 0 },
	},
	{
		key: "box",
		name: "Box Rhythm (4-4-4-4)",
		note: "Settle into steady focus",
		gradient: "from-violet-400 to-fuchsia-500",
		phases: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
	},
	{
		key: "478",
		name: "4-7-8 Calm",
		note: "Invite deep rest",
		gradient: "from-sky-400 to-indigo-500",
		phases: { inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
	},
	{
		key: "resonance",
		name: "Resonant Wave (~6 bpm)",
		note: "Sync with heart coherence",
		gradient: "from-rose-400 to-orange-500",
		phases: { inhale: 5, hold1: 0, exhale: 5, hold2: 0 },
	},
] as const;

const AMBIENT_TRACKS = [
	{ key: "oceanWaves", label: "Ocean Waves", file: "/audio/ocean-waves.mp3", gain: 1 },
	{ key: "rainCarRoof", label: "Rain on Car Roof", file: "/audio/rain-car-roof.mp3", gain: 1 },
	{ key: "lightRain", label: "Light Rain", file: "/audio/light-rain.mp3", gain: 1 },
	{ key: "calmRiver", label: "Calm River", file: "/audio/calm-river.mp3", gain: 1 },
	{ key: "campfire", label: "Campfire", file: "/audio/campfire.mp3", gain: 0.9 },
	{ key: "countryside", label: "Countryside", file: "/audio/countryside.mp3", gain: 1 },
] as const;

const SOUNDS = [{ key: "off", label: "Mute" }, ...AMBIENT_TRACKS] as const;

type Mode = (typeof MODES)[number];
type PhaseKey = keyof Mode["phases"];
type AmbientTrack = (typeof AMBIENT_TRACKS)[number];
type ActiveSoundKey = AmbientTrack["key"];
type SoundKey = "off" | ActiveSoundKey;

const ORDER: PhaseKey[] = ["inhale", "hold1", "exhale", "hold2"];
const LABEL: Record<PhaseKey, string> = {
	inhale: "Inhale",
	hold1: "Hold (Full)",
	exhale: "Exhale",
	hold2: "Hold (Empty)",
};

const FADE_TAU = 0.05;
const STOP_DELAY = 0.12;

type TrackBag = {
	gain: GainNode;
	buffer?: AudioBuffer;
	source?: AudioBufferSourceNode;
	loading?: Promise<AudioBuffer | null>;
};

type AudioBag = {
	ctx: AudioContext;
	master: GainNode;
	tracks: Record<ActiveSoundKey, TrackBag>;
	currentKey: ActiveSoundKey | null;
};

export default function MindfulBreath() {
	const [modeIndex, setModeIndex] = useState(1);
	const [soundOpen, setSoundOpen] = useState(false);
	const [soundKey, setSoundKey] = useState<SoundKey>((AMBIENT_TRACKS[0]?.key ?? "off") as SoundKey);
	const [volume, setVolume] = useState(0.25);
	const [btnPop, setBtnPop] = useState(false);

	const [isRunning, setIsRunning] = useState(false);
	const [phaseIdx, setPhaseIdx] = useState(0);
	const [phaseElapsed, setPhaseElapsed] = useState(0);
	const phaseElapsedRef = useRef(phaseElapsed);

	const mode = useMemo(() => MODES[modeIndex], [modeIndex]);
	const phaseKey = ORDER[phaseIdx];
	const phaseDur = mode.phases[phaseKey];

	const runningRef = useRef(false);
	useEffect(() => {
		runningRef.current = isRunning;
	}, [isRunning]);

	const lastTsRef = useRef<number | null>(null);
	const phaseIdxRef = useRef(phaseIdx);
	useEffect(() => {
		phaseIdxRef.current = phaseIdx;
	}, [phaseIdx]);

	const modeRef = useRef(mode);
	useEffect(() => {
		modeRef.current = mode;
	}, [mode]);

	const volumeRef = useRef(volume);
	useEffect(() => {
		volumeRef.current = volume;
	}, [volume]);

	const audioRef = useRef<AudioBag | null>(null);

	const rafRef = useRef<number | null>(null);
	useEffect(() => {
		phaseElapsedRef.current = phaseElapsed;
	}, [phaseElapsed]);

	const tick = (ts: number) => {
		if (!runningRef.current) return;
		if (lastTsRef.current == null) lastTsRef.current = ts;
		const dt = (ts - lastTsRef.current) / 1000;
		lastTsRef.current = ts;

		let nextIdx = phaseIdxRef.current;
		let nextElapsed = phaseElapsedRef.current + dt;
		let guard = 0;

		while (true) {
			const key: PhaseKey = ORDER[nextIdx];
			const dur = modeRef.current.phases[key];
			if (dur <= 0) {
				nextIdx = (nextIdx + 1) % ORDER.length;
				nextElapsed = 0;
			} else if (nextElapsed < dur) {
				break;
			} else {
				nextElapsed -= dur;
				nextIdx = (nextIdx + 1) % ORDER.length;
			}
			if (++guard > ORDER.length * 4) {
				nextElapsed = 0;
				break;
			}
		}

		if (phaseIdxRef.current !== nextIdx) {
			phaseIdxRef.current = nextIdx;
			setPhaseIdx(nextIdx);
		} else {
			phaseIdxRef.current = nextIdx;
		}
		phaseElapsedRef.current = nextElapsed;
		setPhaseElapsed(nextElapsed);

		rafRef.current = window.requestAnimationFrame(tick);
	};

	const progress = useMemo(() => {
		const p = phaseDur > 0 ? phaseElapsed / phaseDur : 1;
		switch (phaseKey) {
			case "inhale":
				return p;
			case "exhale":
				return 1 - p;
			case "hold1":
				return 1;
			case "hold2":
				return 0;
			default:
				return 0;
		}
	}, [phaseDur, phaseElapsed, phaseKey]);

	async function ensureAudio() {
		try {
			if (audioRef.current) {
				try {
					await audioRef.current.ctx.resume();
				} catch {
					// ignored
				}
				return audioRef.current;
			}
			const AudioCtx =
				window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (!AudioCtx) return null;

			const ctx = new AudioCtx();
			try {
				await ctx.resume();
			} catch {
				// ignored
			}

			const master = ctx.createGain();
			master.gain.value = volumeRef.current;
			master.connect(ctx.destination);

			const tracks = AMBIENT_TRACKS.reduce<Record<ActiveSoundKey, TrackBag>>((acc, track) => {
				const gain = ctx.createGain();
				gain.gain.value = 0;
				gain.connect(master);
				acc[track.key] = { gain };
				return acc;
			}, {} as Record<ActiveSoundKey, TrackBag>);

			audioRef.current = {
				ctx,
				master,
				tracks,
				currentKey: null,
			};
			return audioRef.current;
		} catch {
			return null;
		}
	}

	async function loadTrackBuffer(a: AudioBag, key: ActiveSoundKey) {
		const track = a.tracks[key];
		if (!track) return null;
		if (track.buffer) return track.buffer;
		if (!track.loading) {
			const config = AMBIENT_TRACKS.find((t) => t.key === key);
			if (!config) return null;
			track.loading = (async () => {
				try {
					const res = await fetch(config.file);
					const arrayBuffer = await res.arrayBuffer();
					const buffer = await a.ctx.decodeAudioData(arrayBuffer);
					track.buffer = buffer;
					return buffer;
				} catch {
					return null;
				}
			})();
		}
		try {
			const buffer = await track.loading;
			if (!buffer) return null;
			return buffer;
		} finally {
			track.loading = undefined;
		}
	}

		function fadeOutAll(a: AudioBag) {
			const now = a.ctx.currentTime;
			Object.values(a.tracks).forEach((track) => {
				track.gain.gain.cancelScheduledValues(now);
				track.gain.gain.setTargetAtTime(0, now, FADE_TAU);
				const source = track.source;
			if (source) {
				try {
					source.stop(now + STOP_DELAY);
				} catch {
					// ignored
					}
					track.source = undefined;
				}
			});
		}

	async function playAmbient(a: AudioBag, key: ActiveSoundKey) {
		const trackConfig = AMBIENT_TRACKS.find((t) => t.key === key);
		if (!trackConfig) return;

		const now = a.ctx.currentTime;

		Object.entries(a.tracks).forEach(([trackKey, track]) => {
			if (trackKey === key) return;
			track.gain.gain.cancelScheduledValues(now);
			track.gain.gain.setTargetAtTime(0, now, FADE_TAU);
			const source = track.source;
			if (source) {
				try {
					source.stop(now + STOP_DELAY);
				} catch {
					// ignored
				}
				track.source = undefined;
			}
		});

		const bag = a.tracks[key];
		if (!bag) return;

		const buffer = await loadTrackBuffer(a, key);
		if (!buffer) return;

		if (!bag.source) {
			const source = a.ctx.createBufferSource();
			source.buffer = buffer;
			source.loop = true;
			source.connect(bag.gain);
			source.start();
			source.onended = () => {
				if (bag.source === source) {
					bag.source = undefined;
				}
			};
			bag.source = source;
		}

		bag.gain.gain.cancelScheduledValues(now);
		bag.gain.gain.setTargetAtTime(trackConfig.gain ?? 1, now, FADE_TAU);
		a.currentKey = key;
	}

	async function pauseAudio() {
		const a = audioRef.current;
		if (!a) return;
		fadeOutAll(a);
		try {
			window.setTimeout(() => {
				try {
					void a.ctx.suspend();
				} catch {
					// ignored
				}
			}, 350);
		} catch {
			// ignored
		}
	}

	useEffect(() => {
		(async () => {
			const a = await ensureAudio();
			if (!a) return;
			const now = a.ctx.currentTime;
			a.master.gain.cancelScheduledValues(now);
			a.master.gain.setTargetAtTime(volumeRef.current, now, 0.2);
			const activeKey = soundKey === "off" ? null : (soundKey as ActiveSoundKey);
			if (activeKey) {
				void loadTrackBuffer(a, activeKey);
			}
			if (!isRunning || !activeKey) {
				fadeOutAll(a);
			} else {
				await playAmbient(a, activeKey);
			}
		})();
	}, [isRunning, soundKey]);

	useEffect(() => {
		const a = audioRef.current;
		if (!a) return;
		const now = a.ctx.currentTime;
			a.master.gain.cancelScheduledValues(now);
			a.master.gain.setTargetAtTime(volumeRef.current, now, 0.2);
		}, [volume]);

	useEffect(() => {
		(async () => {
			const a = await ensureAudio();
			if (!a) return;
			AMBIENT_TRACKS.forEach(({ key }) => {
				void loadTrackBuffer(a, key);
			});
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(
		() => () => {
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}
		},
		[],
	);

	const start = async () => {
		setBtnPop(true);
		window.setTimeout(() => setBtnPop(false), 300);
		if (runningRef.current) return;
		const a = await ensureAudio();
		if (a && soundKey !== "off") {
			await loadTrackBuffer(a, soundKey as ActiveSoundKey);
		}
		setIsRunning(true);
		lastTsRef.current = null;
		rafRef.current = window.requestAnimationFrame(tick);
	};

	const pause = () => {
		setIsRunning(false);
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		rafRef.current = null;
		lastTsRef.current = null;
		void pauseAudio();
	};

	const reset = () => {
		pause();
		setPhaseIdx(0);
		setPhaseElapsed(0);
		phaseIdxRef.current = 0;
		phaseElapsedRef.current = 0;
	};

	const onStartPause = () => (runningRef.current ? pause() : start());

	const onPrev = () => {
		if (!isRunning) {
			setModeIndex((i) => (i - 1 + MODES.length) % MODES.length);
			reset();
		}
	};

	const onNext = () => {
		if (!isRunning) {
			setModeIndex((i) => (i + 1) % MODES.length);
			reset();
		}
	};

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				e.preventDefault();
				onStartPause();
			}
			if (!isRunning && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
				e.preventDefault();
				e.key === "ArrowLeft" ? onPrev() : onNext();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isRunning]);

	const lockMode = isRunning;

	return (
		<div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 antialiased selection:bg-emerald-300/30">
			<header className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between px-5 py-4">
				<div className="flex items-center gap-3">
					<div className={`h-9 w-9 rounded-2xl bg-gradient-to-tr ${mode.gradient} p-[2px]`}>
						<div className="h-full w-full rounded-2xl bg-slate-900/85 backdrop-blur" />
					</div>
					<h1 className="text-base font-semibold tracking-tight">Mindful Breath</h1>
				</div>
				<div className="relative">
					<button
						onClick={() => setSoundOpen((v) => !v)}
						className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
						aria-expanded={soundOpen}
						aria-haspopup="dialog"
					>
						<IconMusic className="h-4 w-4 text-white/70" />
						Sound
					</button>
					{soundOpen && (
						<div
							role="dialog"
							aria-label="Ambient sound settings"
							className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
						>
							<div className="grid grid-cols-2 gap-2">
								{SOUNDS.map((s) => (
									<button
										key={s.key}
										onClick={() => setSoundKey(s.key)}
										className={`rounded-xl px-3 py-1.5 text-center text-xs ${
											soundKey === s.key ? "bg-white/15 ring-1 ring-white/20" : "bg-white/5 hover:bg-white/10"
										}`}
										aria-pressed={soundKey === s.key}
									>
										{s.label}
									</button>
								))}
							</div>
							<div className="mt-3 text-xs text-slate-300">Volume</div>
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={volume}
								onChange={(e) => setVolume(Number.parseFloat(e.target.value))}
								className="mt-1 w-full accent-emerald-400"
								aria-label="Background sound volume"
							/>
						</div>
					)}
				</div>
			</header>

			<section className="fixed left-0 right-0 top-0 z-20 h-[50vh] pt-28">
				<div className="relative mx-auto flex h-full max-w-7xl items-center justify-center px-4">
					<div className={`relative aspect-square w-[min(76vh,720px)] max-w-[720px] ${isRunning ? "ring-pulse" : ""}`}>
						<div className="absolute inset-0 grid place-items-center">
							<BreathRing
								gradient={mode.gradient}
								phase={LABEL[phaseKey]}
								progress={progress}
								phaseKey={phaseKey}
								phaseElapsed={phaseElapsed}
								phaseDuration={phaseDur}
							/>
						</div>
						<div className="absolute inset-x-0 bottom-0 flex items-center justify-center translate-y-6">
							<div className="flex items-center gap-3">
								<button
									onClick={onStartPause}
									className={`rounded-full bg-gradient-to-br ${mode.gradient} px-6 py-3 text-sm font-medium text-white transition-transform focus:outline-none focus:ring-2 focus:ring-white/30 ${
										btnPop ? "btn-pop" : ""
									}`}
								>
									{isRunning ? "Pause" : "Begin"}
								</button>
								{!isRunning && (
									<button
										onClick={reset}
										className="rounded-full bg-white/5 px-4 py-3 text-xs text-slate-200/80 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
									>
										Reset
									</button>
								)}
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="fixed inset-x-0 bottom-0 z-10 h-[50vh]">
				<div className="mx-auto flex h-full max-w-7xl items-end px-4 pb-10">
					<div className="relative flex w-full items-center justify-between gap-6">
						<button
							onClick={onPrev}
							className={`group flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
								lockMode ? "cursor-not-allowed bg-white/5/30 opacity-40" : "bg-white/5 hover:bg-white/10 focus:ring-2 focus:ring-white/20"
							}`}
							aria-label="Previous breathing pattern"
							disabled={lockMode}
						>
							<IconChevronLeft className="h-5 w-5 text-white/80" />
						</button>
						<div className="flex min-w-0 flex-1 flex-col items-center px-4 text-center">
							<div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${mode.gradient}`} />
							<div className="mt-3 text-lg font-semibold tracking-tight">{mode.name}</div>
							<div className="mt-1 text-sm text-slate-400">
								{mode.note} · {LABEL[phaseKey]}
								{phaseDur ? ` ${Math.max(0, Math.ceil(phaseDur - phaseElapsed))}s remaining` : ""}
							</div>
							<div className="mt-4 flex items-center gap-1">
								{MODES.map((_, i) => (
									<span
										key={_.key}
										aria-hidden
										className={`h-1.5 w-5 rounded-full transition-all ${i === modeIndex ? "bg-white/80" : "bg-white/20"}`}
									/>
								))}
							</div>
						</div>
						<button
							onClick={onNext}
							className={`group flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
								lockMode ? "cursor-not-allowed bg-white/5/30 opacity-40" : "bg-white/5 hover:bg-white/10 focus:ring-2 focus:ring-white/20"
							}`}
							aria-label="Next breathing pattern"
							disabled={lockMode}
						>
							<IconChevronRight className="h-5 w-5 text-white/80" />
						</button>
					</div>
				</div>
			</section>

			<DecorativeBackgroundLite />

			<style jsx>{`
				.btn-pop {
					animation: btn-pop 0.35s ease-out;
				}
				@keyframes btn-pop {
					0% {
						transform: scale(0.94);
					}
					60% {
						transform: scale(1.06);
					}
					100% {
						transform: scale(1);
					}
				}
				.ring-pulse {
					animation: ring-pulse 2.4s ease-in-out infinite;
				}
				@keyframes ring-pulse {
					0%,
					100% {
						transform: scale(1);
					}
					50% {
						transform: scale(1.015);
					}
				}
			`}</style>
		</div>
	);
}

function BreathRing({
	gradient,
	phase,
	progress,
	phaseKey,
	phaseElapsed,
	phaseDuration,
}: {
	gradient: Mode["gradient"];
	phase: string;
	progress: number;
	phaseKey: PhaseKey;
	phaseElapsed: number;
	phaseDuration: number;
}) {
	const r = 42;
	const circumference = 2 * Math.PI * r;
	const dash = circumference;
	const offset = (1 - progress) * dash;
	const isHold = phaseKey === "hold1" || phaseKey === "hold2";
	const holdProgress = phaseDuration > 0 ? Math.min(1, Math.max(0, phaseElapsed / phaseDuration)) : 0;
	const holdRadius = r - 6;
	const holdCircumference = 2 * Math.PI * holdRadius;
	const holdDash = holdCircumference;
	const holdOffset = (1 - holdProgress) * holdDash;
	const holdRemaining = isHold && phaseDuration > 0 ? Math.max(0, Math.ceil(phaseDuration - phaseElapsed)) : null;

	return (
		<div className="relative grid place-items-center">
			<div className="absolute -inset-10 -z-10 rounded-[36px] bg-gradient-to-br from-white/10 to-white/5 blur-3xl" />
			<div className="relative aspect-square w-[min(70vh,600px)] max-w-[560px]">
				<svg viewBox="0 0 100 100" className="h-full w-full text-white">
					<defs>
						<linearGradient id="ring" x1="0" x2="1" y1="0" y2="1">
							<stop offset="0%" stopColor="currentColor" />
							<stop offset="100%" stopColor="currentColor" />
						</linearGradient>
					</defs>
					<circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="6" fill="none" />
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
						{holdRemaining != null ? <span className="tabular-nums text-[0.7rem] text-slate-100/80">{holdRemaining}s</span> : null}
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

function DecorativeBackgroundLite() {
	return (
		<div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
			<div className="absolute -left-10 -top-24 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-emerald-500/15 to-emerald-400/5 blur-3xl" />
			<div className="absolute -bottom-24 -right-10 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 blur-3xl" />
			<div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.06),transparent)]" />
		</div>
	);
}

type IconProps = SVGProps<SVGSVGElement>;

function IconMusic({ className, ...props }: IconProps) {
	return (
		<svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden focusable="false" {...props}>
			<path d="M16.9 2.08a1.5 1.5 0 0 0-1.21-.33l-7.5 1.29A1.5 1.5 0 0 0 7 4.5v8.28a2.75 2.75 0 1 0 1.5 2.44v-6.3l6-1.03v3.59a2.75 2.75 0 1 0 1.5 2.44V3.5a1.5 1.5 0 0 0-.6-1.42Z" />
		</svg>
	);
}

function IconChevronLeft({ className, ...props }: IconProps) {
	return (
		<svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden focusable="false" {...props}>
			<path d="M12.78 15.53a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 1 1 1.06 1.06L9.06 10l3.72 3.72a.75.75 0 0 1 0 1.06Z" />
		</svg>
	);
}

function IconChevronRight({ className, ...props }: IconProps) {
	return (
		<svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden focusable="false" {...props}>
			<path d="M7.22 4.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L10.94 10 7.22 6.28a.75.75 0 0 1 0-1.06Z" />
		</svg>
	);
}

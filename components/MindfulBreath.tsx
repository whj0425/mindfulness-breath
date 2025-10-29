"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
	DEFAULT_SESSION_PRESET,
	DEFAULT_SOUND_KEY,
	DEFAULT_VOLUME,
	MODES,
	ORDER,
	SESSION_PRESETS,
	SOUNDS,
} from "./mindful-breath/constants";
import { useAmbientAudio } from "./mindful-breath/hooks/useAmbientAudio";
import {
	PHASE_LABEL,
	useBreathTimer,
} from "./mindful-breath/hooks/useBreathTimer";
import type { SoundKey } from "./mindful-breath/types";
import { BreathRing } from "./mindful-breath/ui/BreathRing";
import { DecorativeBackgroundLite } from "./mindful-breath/ui/DecorativeBackground";
import { IconChevronLeft, IconChevronRight } from "./mindful-breath/ui/Icons";

const STORAGE_KEYS = {
	sound: "mindful:sound",
	volume: "mindful:volume",
	mode: "mindful:mode",
	preset: "mindful:preset",
	companion: "mindful:companion",
} as const;

type SessionPresetKey = (typeof SESSION_PRESETS)[number]["key"];

export default function MindfulBreath() {
	const [soundKey, setSoundKey] = useState<SoundKey>(DEFAULT_SOUND_KEY);
	const [volume, setVolume] = useState(DEFAULT_VOLUME);
	const [btnPop, setBtnPop] = useState(false);
	const [companionMode, setCompanionMode] = useState(false);
	const [selectedPresetKey, setSelectedPresetKey] =
		useState<SessionPresetKey>(DEFAULT_SESSION_PRESET.key);
	const [hasHydrated, setHasHydrated] = useState(false);

	const [
		{
			mode,
			phaseKey,
			phaseElapsed,
			phaseDuration,
			isRunning,
			sessionDuration,
			sessionElapsed,
			sessionRemaining,
			sessionProgress,
			isComplete,
		},
		{
			start: startTimer,
			pause: pauseTimer,
			reset: resetTimer,
			nextMode,
			prevMode,
			setSessionDuration,
			setModeIndex,
		},
	] = useBreathTimer({
		initialSessionDurationSec: DEFAULT_SESSION_PRESET.duration,
	});

	const selectedPreset = useMemo(
		() =>
			SESSION_PRESETS.find((preset) => preset.key === selectedPresetKey) ??
			DEFAULT_SESSION_PRESET,
		[selectedPresetKey],
	);

	const sessionLocked = sessionElapsed > 0 && !isComplete;
	const canReset = sessionElapsed > 0 || isComplete;

	const activeSound = useMemo(
		() => SOUNDS.find((sound) => sound.key === soundKey),
		[soundKey],
	);
	const activeSoundLabel = activeSound?.label ?? "Mute";
	const volumePercent = Math.round(volume * 100);
	const shouldPlayAudio = isRunning || companionMode;

	const { prepareForStart, pauseAmbient } = useAmbientAudio({
		soundKey,
		isRunning: shouldPlayAudio,
		volume,
	});

	const upcomingPhase = useMemo(() => {
		const currentIndex = ORDER.indexOf(phaseKey);
		if (currentIndex === -1) {
			return null;
		}
		for (let step = 1; step <= ORDER.length; step += 1) {
			const candidateKey = ORDER[(currentIndex + step) % ORDER.length];
			if (mode.phases[candidateKey] > 0) {
				return {
					key: candidateKey,
					label: PHASE_LABEL[candidateKey],
					duration: mode.phases[candidateKey],
					prompt: mode.prompts?.[candidateKey],
				};
			}
		}
		return null;
	}, [mode.phases, mode.prompts, phaseKey]);

	useEffect(() => {
		if (process.env.NODE_ENV !== "production") {
			void fetch("/__nextjs_disable_dev_indicator", {
				method: "POST",
			}).catch(() => {
				// ignore failures from the optional dev indicator shutdown
			});
		}
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const storedSound = window.localStorage.getItem(STORAGE_KEYS.sound);
			const storedVolume = window.localStorage.getItem(STORAGE_KEYS.volume);
			const storedMode = window.localStorage.getItem(STORAGE_KEYS.mode);
			const storedPreset = window.localStorage.getItem(STORAGE_KEYS.preset);
			const storedCompanion = window.localStorage.getItem(STORAGE_KEYS.companion);

			let nextSoundKey: SoundKey | null = null;
			if (storedSound && SOUNDS.some((sound) => sound.key === storedSound)) {
				nextSoundKey = storedSound as SoundKey;
				setSoundKey(nextSoundKey);
			}

			if (storedVolume != null) {
				const parsed = Number(storedVolume);
				if (!Number.isNaN(parsed)) {
					setVolume(Math.min(1, Math.max(0, parsed)));
				}
			}

			if (storedMode) {
				const nextIndex = MODES.findIndex((pattern) => pattern.key === storedMode);
				if (nextIndex >= 0) {
					setModeIndex(() => nextIndex);
				}
			}

			if (
				storedPreset &&
				SESSION_PRESETS.some((preset) => preset.key === storedPreset)
			) {
				setSelectedPresetKey(storedPreset as SessionPresetKey);
				const preset = SESSION_PRESETS.find((item) => item.key === storedPreset);
				if (preset) {
					setSessionDuration(preset.duration);
				}
			}

			if (storedCompanion === "true") {
				const effectiveSound =
					(nextSoundKey ?? soundKey) === "off"
						? DEFAULT_SOUND_KEY
						: (nextSoundKey ?? soundKey);
				if ((nextSoundKey ?? soundKey) === "off") {
					setSoundKey(effectiveSound);
				}
				pauseTimer();
				setCompanionMode(true);
				void prepareForStart(effectiveSound);
			}
		} catch {
			// ignore storage read issues
		} finally {
			setHasHydrated(true);
		}
	}, [pauseTimer, prepareForStart, setModeIndex, setSessionDuration, soundKey]);

	useEffect(() => {
		if (!hasHydrated || typeof window === "undefined") return;
		try {
			window.localStorage.setItem(STORAGE_KEYS.sound, soundKey);
		} catch {
			// ignore storage write issues
		}
	}, [hasHydrated, soundKey]);

	useEffect(() => {
		if (!hasHydrated || typeof window === "undefined") return;
		try {
			window.localStorage.setItem(STORAGE_KEYS.volume, volume.toString());
		} catch {
			// ignore storage write issues
		}
	}, [hasHydrated, volume]);

	useEffect(() => {
		if (!hasHydrated || typeof window === "undefined") return;
		try {
			window.localStorage.setItem(STORAGE_KEYS.mode, mode.key);
		} catch {
			// ignore
		}
	}, [hasHydrated, mode.key]);

	useEffect(() => {
		if (!hasHydrated || typeof window === "undefined") return;
		try {
			window.localStorage.setItem(STORAGE_KEYS.preset, selectedPresetKey);
		} catch {
			// ignore
		}
	}, [hasHydrated, selectedPresetKey]);

	useEffect(() => {
		if (!hasHydrated || typeof window === "undefined") return;
		try {
			window.localStorage.setItem(
				STORAGE_KEYS.companion,
				companionMode ? "true" : "false",
			);
		} catch {
			// ignore
		}
	}, [hasHydrated, companionMode]);

	const handleSelectPreset = useCallback(
		(key: SessionPresetKey) => {
			if (sessionLocked) return;
			setSelectedPresetKey(key);
			const preset =
				SESSION_PRESETS.find((candidate) => candidate.key === key) ??
				DEFAULT_SESSION_PRESET;
			setSessionDuration(preset.duration);
		},
		[sessionLocked, setSessionDuration],
	);

	const handleStart = useCallback(async () => {
		setBtnPop(true);
		window.setTimeout(() => setBtnPop(false), 300);
		if (isRunning) return;
		if (companionMode) {
			setCompanionMode(false);
		}
		await prepareForStart(soundKey);
		startTimer();
	}, [companionMode, isRunning, prepareForStart, soundKey, startTimer]);

	const handlePause = useCallback(() => {
		pauseTimer();
		pauseAmbient();
	}, [pauseAmbient, pauseTimer]);

	const handleStartPause = useCallback(() => {
		if (isRunning) {
			handlePause();
		} else {
			void handleStart();
		}
	}, [handlePause, handleStart, isRunning]);

	const handleReset = useCallback(() => {
		pauseAmbient();
		resetTimer();
	}, [pauseAmbient, resetTimer]);

	const handlePrev = useCallback(() => {
		if (sessionLocked) return;
		prevMode();
		resetTimer();
	}, [prevMode, resetTimer, sessionLocked]);

	const handleNext = useCallback(() => {
		if (sessionLocked) return;
		nextMode();
		resetTimer();
	}, [nextMode, resetTimer, sessionLocked]);

	const enableCompanionMode = useCallback(async () => {
		const effectiveKey = soundKey === "off" ? DEFAULT_SOUND_KEY : soundKey;
		if (soundKey === "off") {
			setSoundKey(effectiveKey);
		}
		pauseTimer();
		setCompanionMode(true);
		await prepareForStart(effectiveKey);
	}, [pauseTimer, prepareForStart, soundKey]);

	const disableCompanionMode = useCallback(() => {
		setCompanionMode(false);
		pauseAmbient();
	}, [pauseAmbient]);

	const handleCompanionToggle = useCallback(() => {
		if (companionMode) {
			disableCompanionMode();
		} else {
			void enableCompanionMode();
		}
	}, [companionMode, disableCompanionMode, enableCompanionMode]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.code === "Space") {
				event.preventDefault();
				handleStartPause();
				return;
			}
			if (sessionLocked) return;
			if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
				event.preventDefault();
				if (event.key === "ArrowLeft") {
					handlePrev();
				} else {
					handleNext();
				}
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handleNext, handlePrev, handleStartPause, sessionLocked]);

	useEffect(() => {
		if (!isComplete) return;
		pauseAmbient();
	}, [isComplete, pauseAmbient]);

	useEffect(() => {
		if (!companionMode) return;
		if (soundKey === "off") {
			disableCompanionMode();
		}
	}, [companionMode, disableCompanionMode, soundKey]);

	const phaseLabel = PHASE_LABEL[phaseKey];
	const phaseSupport = phaseDuration
		? `${Math.max(0, Math.ceil(phaseDuration - phaseElapsed))}s remaining`
		: "Soft rhythm in progress";
	const startLabel = isRunning
		? "Pause"
		: isComplete
		? "Restart"
		: sessionElapsed > 0
		? "Resume"
		: "Begin";
	const sessionRemainingLabel = formatClock(sessionRemaining);
	const sessionTotalLabel = formatClock(sessionDuration);
	const progressPercent = Math.min(100, Math.max(0, sessionProgress * 100));
	const phasePrompt = mode.prompts?.[phaseKey];
	const lockMode = sessionLocked;

	return (
		<div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-slate-100 antialiased selection:bg-emerald-300/30">
			<DecorativeBackgroundLite />

			<div className="relative flex min-h-screen w-full flex-col lg:flex-row">
				<section className="flex flex-1 flex-col justify-between px-8 py-12 sm:px-12 lg:px-16 xl:px-20">
					<header className="flex items-center justify-between gap-6">
						<button
							type="button"
							onClick={handlePrev}
							className={`flex h-12 w-12 items-center justify-center rounded-full border border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
								lockMode
									? "cursor-not-allowed bg-white/5 opacity-40"
									: "bg-white/5 hover:bg-white/10"
							}`}
							aria-label="Previous breathing pattern"
							disabled={lockMode}
						>
							<IconChevronLeft className="h-5 w-5 text-white/80" />
						</button>
						<div className="flex flex-col items-center text-center">
							<span className="text-[0.65rem] uppercase tracking-[0.3em] text-white/60">
								Pattern
							</span>
							<p className="mt-3 text-[clamp(1.5rem,2vw,2.4rem)] font-semibold tracking-tight text-white">
								{mode.name}
							</p>
							{mode.note ? (
								<p className="mt-1 max-w-xs text-sm text-slate-400">
									{mode.note}
								</p>
							) : null}
						</div>
						<button
							type="button"
							onClick={handleNext}
							className={`flex h-12 w-12 items-center justify-center rounded-full border border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
								lockMode
									? "cursor-not-allowed bg-white/5 opacity-40"
									: "bg-white/5 hover:bg-white/10"
							}`}
							aria-label="Next breathing pattern"
							disabled={lockMode}
						>
							<IconChevronRight className="h-5 w-5 text-white/80" />
						</button>
					</header>

					<div className="flex flex-1 flex-col items-center justify-center gap-12 py-12">
						<div className="relative grid place-items-center">
							{!companionMode ? (
								<BreathRing
									gradient={mode.gradient}
									phaseKey={phaseKey}
									phaseElapsed={phaseElapsed}
									phaseDuration={phaseDuration}
								/>
							) : (
								<div className="w-[clamp(320px,45vw,520px)] rounded-[36px] border border-white/12 bg-slate-900/70 p-10 text-center shadow-2xl backdrop-blur">
									<div className="text-[0.65rem] uppercase tracking-[0.35em] text-emerald-300/80">
										Companion Mode
									</div>
									<div className="mt-4 text-2xl font-semibold text-white">
										{activeSoundLabel}
									</div>
									<p className="mt-3 text-sm text-slate-300">
										Ambient sound continues while the primary animation rests.
									</p>
									<div className="mt-8 flex flex-wrap justify-center gap-3">
										<button
											type="button"
											onClick={disableCompanionMode}
											className="rounded-full bg-emerald-500/25 px-6 py-2 text-sm font-medium text-emerald-100 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/25 hover:bg-emerald-500/35"
										>
											Return to Ring
										</button>
										<button
											type="button"
											onClick={() => {
												setSoundKey("off");
												disableCompanionMode();
											}}
											className="rounded-full border border-white/20 px-6 py-2 text-sm font-medium text-slate-100/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
										>
											Stop Audio
										</button>
									</div>
								</div>
							)}
						</div>

						<div className="w-full max-w-2xl">
							<div className="flex flex-wrap items-center justify-center gap-4">
								<button
									type="button"
									onClick={handleStartPause}
									className={`flex h-14 min-w-[140px] items-center justify-center rounded-full bg-gradient-to-r ${mode.gradient} px-8 text-base font-semibold text-white shadow-[0_12px_45px_rgba(56,189,248,0.25)] transition-transform focus:outline-none focus:ring-2 focus:ring-white/30 ${
										btnPop ? "btn-pop" : ""
									}`}
								>
									{startLabel}
								</button>
								{!isRunning && canReset ? (
									<button
										type="button"
										onClick={handleReset}
										className="flex h-14 min-w-[120px] items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 text-sm font-semibold text-slate-100/90 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
									>
										Reset
									</button>
								) : null}
								<button
									type="button"
									onClick={handleCompanionToggle}
									className={`flex h-14 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
										companionMode
											? "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
											: "bg-white/5 text-slate-100/90 hover:bg-white/10"
									}`}
									aria-pressed={companionMode}
								>
									{companionMode ? "Companion On" : "Companion Off"}
								</button>
							</div>
							{(companionMode || soundKey !== "off") && (
								<div className="mt-6 flex w-full flex-col items-center px-4">
									<label className="flex w-full max-w-xs flex-col gap-2 text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
										<span>Companion Volume</span>
										<input
											type="range"
											min={0}
											max={1}
											step={0.01}
											value={volume}
											onChange={(event) => setVolume(Number(event.target.value))}
											className="accent-emerald-400"
											aria-label="Background volume"
											disabled={soundKey === "off" && !companionMode}
										/>
										<span className="text-[0.65rem] text-slate-500">
											Level {volumePercent}%
										</span>
									</label>
								</div>
							)}

							<div className="mt-10 flex flex-col items-center gap-3">
								<span className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">
									Duration
								</span>
								<div
									className="flex flex-wrap justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1"
									role="group"
									aria-label="Select session duration"
								>
									{SESSION_PRESETS.map((preset) => {
										const isActive = preset.key === selectedPresetKey;
										return (
											<button
												type="button"
												key={preset.key}
												onClick={() => handleSelectPreset(preset.key)}
												className={`flex h-11 min-w-[92px] items-center justify-center rounded-full px-4 text-xs font-semibold uppercase tracking-[0.3em] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
													isActive
														? `bg-gradient-to-r ${mode.gradient} text-white shadow-[0_6px_20px_rgba(56,189,248,0.35)]`
														: "bg-white/0 text-slate-300 hover:bg-white/10"
												}`}
												disabled={sessionLocked}
												aria-pressed={isActive}
											>
												{preset.label}
											</button>
										);
									})}
								</div>
							</div>
						</div>
					</div>

					<footer className="mt-12 flex items-center justify-between text-[0.65rem] uppercase tracking-[0.35em] text-white/50">
						<span>Mindful Breath</span>
						<span>
							Space · {isRunning ? "Pause" : sessionElapsed > 0 ? "Resume" : "Begin"}
						</span>
					</footer>
				</section>

				<aside className="flex w-full flex-col gap-8 border-t border-white/10 bg-slate-950/70 px-8 py-12 backdrop-blur-sm lg:w-[340px] lg:border-l lg:border-t-0 lg:px-10 xl:w-[380px]">
					<div>
						<span className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
							Session
						</span>
						<div className="mt-3 flex items-center justify-between text-sm text-slate-300">
							<span className="tabular-nums text-base font-semibold text-white">
								{sessionRemainingLabel}
							</span>
							<span className="text-xs uppercase tracking-[0.3em] text-slate-500">
								of {sessionTotalLabel}
							</span>
						</div>
						<div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
							<div
								className={`h-full rounded-full bg-gradient-to-r ${mode.gradient} transition-[width] duration-300 ease-out`}
								style={{ width: `${progressPercent}%` }}
							/>
						</div>
						<div className="mt-3 flex gap-2 text-xs text-slate-500">
							<span>Preset</span>
							<span className="font-medium text-slate-300">{selectedPreset.label}</span>
						</div>
					</div>

					<div>
						<span className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
							Current Phase
						</span>
						<div className="mt-3 text-lg font-semibold text-white">{phaseLabel}</div>
						<div className="text-xs text-slate-400">{phaseSupport}</div>
						{phasePrompt ? (
							<p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-inner">
								{phasePrompt}
							</p>
						) : null}
					</div>

					{upcomingPhase ? (
						<div>
							<span className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
								Up Next
							</span>
							<div className="mt-3 flex items-center justify-between text-sm text-slate-300">
								<span className="font-medium text-white">
									{upcomingPhase.label}
								</span>
								<span className="text-xs text-slate-500">
									{upcomingPhase.duration > 0
										? `${upcomingPhase.duration}s`
										: "Transition"}
								</span>
							</div>
							{upcomingPhase.prompt ? (
								<p className="mt-2 text-sm text-slate-300">
									{upcomingPhase.prompt}
								</p>
							) : null}
						</div>
					) : null}

					<div>
						<span className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
							Soundscape
						</span>
						<div className="mt-3 text-sm text-slate-300">
							Active · <span className="font-medium text-white">{activeSoundLabel}</span>
						</div>
						<div className="mt-3 flex flex-wrap gap-2">
							{SOUNDS.map((sound) => {
								const active = sound.key === soundKey;
								return (
									<button
										key={sound.key}
										type="button"
										onClick={() => setSoundKey(sound.key)}
										className={`flex h-9 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
											active
												? "bg-white/20 text-white"
												: "bg-white/5 text-slate-200/80 hover:bg-white/10"
										}`}
										aria-pressed={active}
									>
										{sound.label}
									</button>
								);
							})}
						</div>
					</div>

					<div className="mt-auto">
						<span className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
							Shortcuts
						</span>
						<ul className="mt-3 space-y-1 text-xs text-slate-500">
							<li>
								<span className="font-medium text-slate-300">Space</span> Start / Pause
							</li>
							<li>
								<span className="font-medium text-slate-300">← / →</span> Switch pattern (idle)
							</li>
						</ul>
					</div>
				</aside>
			</div>

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
			`}</style>
		</div>
	);
}

function formatClock(seconds: number): string {
	const clamped = Math.max(0, Math.round(seconds));
	const mins = Math.floor(clamped / 60);
	const secs = clamped % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

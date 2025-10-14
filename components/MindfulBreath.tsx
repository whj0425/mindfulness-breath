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

	const timelinePhases = useMemo(
		() =>
			ORDER.map((key) => ({
				key,
				label: PHASE_LABEL[key],
				duration: mode.phases[key],
			})),
		[mode.phases],
	);

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

	const handleRestart = useCallback(() => {
		handleReset();
		void handleStart();
	}, [handleReset, handleStart]);

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

			<main className="relative flex min-h-screen w-full flex-col gap-12 px-10 pb-20 pt-20 lg:flex-row lg:gap-16 lg:px-16 xl:gap-20 xl:px-24">
				<section className="flex flex-1 flex-col items-center gap-10">
					<div className="flex w-full items-start justify-between gap-4">
						<button
							onClick={handlePrev}
							className={`group flex h-12 w-12 items-center justify-center rounded-full border border-white/10 transition-colors ${
								lockMode
									? "cursor-not-allowed bg-white/5 opacity-40"
									: "bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
							}`}
							aria-label="Previous breathing pattern"
							disabled={lockMode}
						>
							<IconChevronLeft className="h-5 w-5 text-white/80" />
						</button>
						<div className="flex min-w-0 flex-col items-center text-center">
							<div className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-white/70">
								Current Pattern
							</div>
							<div className="mt-3 text-2xl font-semibold tracking-tight text-white">
								{mode.name}
							</div>
							<p className="mt-1 text-sm text-slate-400">{mode.note}</p>
							<div className="mt-4 flex items-center gap-2">
								{timelinePhases.map((phase) => {
									const active = phase.key === phaseKey;
									return (
										<span
											key={phase.key}
											className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
												active
													? `w-16 bg-gradient-to-r ${mode.gradient} shadow-[0_0_15px_rgba(56,189,248,0.35)]`
													: "w-10 bg-white/10"
											}`}
										/>
									);
								})}
							</div>
							<div className="mt-5 flex items-center gap-3 text-sm text-slate-400">
								<span className="text-xs uppercase tracking-[0.3em] text-slate-500">
									Phase
								</span>
								<span className="font-medium text-slate-200">{phaseLabel}</span>
								<span className="text-slate-500">·</span>
								<span className="tabular-nums text-slate-300">{phaseSupport}</span>
							</div>
						</div>
						<button
							onClick={handleNext}
							className={`group flex h-12 w-12 items-center justify-center rounded-full border border-white/10 transition-colors ${
								lockMode
									? "cursor-not-allowed bg-white/5 opacity-40"
									: "bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
							}`}
							aria-label="Next breathing pattern"
							disabled={lockMode}
						>
							<IconChevronRight className="h-5 w-5 text-white/80" />
						</button>
					</div>

					<div className="relative flex w-full justify-center">
						{!companionMode ? (
							<div className="relative flex flex-col items-center gap-6">
								<div className="breath-halo" aria-hidden />
								<BreathRing
									gradient={mode.gradient}
									phaseKey={phaseKey}
									phaseElapsed={phaseElapsed}
									phaseDuration={phaseDuration}
								/>
								<div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-center shadow-xl backdrop-blur">
									<div className="flex items-baseline justify-center gap-2">
										<span className="tabular-nums text-4xl font-semibold text-white">
											{sessionRemainingLabel}
										</span>
										<span className="text-sm uppercase tracking-[0.35em] text-slate-500">
											Remaining
										</span>
									</div>
									<div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
										<div
											className={`h-full rounded-full bg-gradient-to-r ${mode.gradient} transition-[width] duration-300 ease-out`}
											style={{ width: `${progressPercent}%` }}
										/>
									</div>
									<div className="mt-3 text-[0.7rem] uppercase tracking-[0.35em] text-slate-500">
										{selectedPreset.label} · Total {sessionTotalLabel}
									</div>
								</div>
							</div>
						) : (
							<div className="relative w-full max-w-lg rounded-[36px] border border-white/10 bg-slate-900/70 p-10 text-center shadow-2xl backdrop-blur">
								<div className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">
									Audio Companion
								</div>
								<div className="mt-3 text-xl font-semibold text-white">
									{activeSoundLabel}
								</div>
								<p className="mt-3 text-sm text-slate-300">
									Ambient sound continues while the main animation rests.
								</p>
								<div className="mt-2 text-xs text-slate-400">
									Volume · {volumePercent}%
								</div>
								<div className="mt-8 flex flex-wrap justify-center gap-3">
									<button
										type="button"
										onClick={disableCompanionMode}
										className="rounded-full bg-emerald-500/30 px-6 py-2 text-sm font-medium text-emerald-100 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/30 hover:bg-emerald-500/40"
									>
										Return to Practice
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

					<div className="flex flex-col items-center gap-6">
						<div className="flex flex-wrap items-center justify-center gap-3">
							<button
								type="button"
								onClick={handleStartPause}
								className={`rounded-full bg-gradient-to-r ${mode.gradient} px-8 py-3 text-base font-semibold text-white shadow-[0_12px_45px_rgba(56,189,248,0.25)] transition-transform focus:outline-none focus:ring-2 focus:ring-white/30 ${
									btnPop ? "btn-pop" : ""
								}`}
							>
								{startLabel}
							</button>
							{!isRunning && canReset ? (
								<button
									type="button"
									onClick={handleReset}
									className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
								>
									Reset
								</button>
							) : null}
						</div>

						<div className="text-xs uppercase tracking-[0.35em] text-slate-500">
							Duration
						</div>
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
										className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
											isActive
												? "bg-white/25 text-white"
												: "text-slate-200/80 hover:bg-white/10"
										}`}
										aria-pressed={isActive}
										disabled={sessionLocked}
										title={
											sessionLocked
												? "Reset the session to change duration"
												: `Run a ${preset.label} practice`
										}
									>
										{preset.label}
									</button>
								);
							})}
						</div>
					</div>
				</section>

				<aside className="w-full max-w-[28rem] space-y-5 lg:w-[22rem] xl:w-[26rem]">
					{isComplete ? (
						<div
							className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-slate-100 shadow-xl backdrop-blur"
							role="status"
							aria-live="polite"
						>
							<div className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200/90">
								Session Complete
							</div>
							<div className="mt-2 text-xl font-semibold text-white">
								Steady and calm.
							</div>
							<p className="mt-2 text-sm text-emerald-100/90">
								Take a breath, notice how your body feels, then choose your next step.
							</p>
							<div className="mt-4 space-y-1 text-xs text-emerald-100/80">
								<div>• Name one sensation you can feel right now.</div>
								<div>• Sip water before returning to your day.</div>
							</div>
							<div className="mt-4 text-xs text-emerald-100/70">
								Total practice · {sessionTotalLabel}
							</div>
							<div className="mt-5 flex flex-wrap gap-2">
								<button
									type="button"
									onClick={handleRestart}
									className={`rounded-full bg-gradient-to-r ${mode.gradient} px-5 py-2 text-sm font-medium text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-white/30`}
								>
									Replay {selectedPreset.label}
								</button>
								<button
									type="button"
									onClick={handleReset}
									className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-slate-100/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
								>
									Choose Duration
								</button>
							</div>
						</div>
					) : null}

					<div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
						<div className="flex items-center justify-between">
							<div className="text-xs uppercase tracking-[0.35em] text-slate-500">
								Session Timeline
							</div>
							<span className="text-sm text-slate-300">
								{selectedPreset.label}
							</span>
						</div>
						<div className="mt-4">
							<div className="flex items-baseline justify-between">
								<div className="flex items-baseline gap-2">
									<span className="tabular-nums text-2xl font-semibold text-white">
										{sessionRemainingLabel}
									</span>
									<span className="text-xs uppercase tracking-[0.35em] text-slate-500">
										Remaining
									</span>
								</div>
								<span className="text-xs text-slate-400">
									Total {sessionTotalLabel}
								</span>
							</div>
							<div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
								<div
									className={`h-full rounded-full bg-gradient-to-r ${mode.gradient} transition-[width] duration-300 ease-out`}
									style={{ width: `${progressPercent}%` }}
								/>
							</div>
						</div>
						<div className="mt-5 space-y-2">
							{timelinePhases.map((phase) => {
								const active = phase.key === phaseKey;
								return (
									<div
										key={phase.key}
										className={`flex items-center justify-between rounded-2xl px-3 py-2 transition-colors ${
											active ? "bg-white/10" : "bg-white/5"
										}`}
									>
										<div className="flex items-center gap-2">
											<span
												className={`h-2.5 w-2.5 rounded-full ${
													active ? "bg-emerald-300" : "bg-slate-500/50"
												}`}
												aria-hidden
											/>
											<span className="text-sm font-medium text-slate-200">
												{phase.label}
											</span>
										</div>
										<div className="text-xs text-slate-400">
											{phase.duration > 0 ? `${phase.duration}s` : "—"}
										</div>
									</div>
								);
							})}
						</div>
					</div>

					<div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
						<div className="flex items-center justify-between">
							<div className="text-xs uppercase tracking-[0.35em] text-slate-500">
								Phase Focus
							</div>
							<div className="flex items-center gap-2 text-xs text-slate-400">
								<span className="inline-block h-2 w-2 rounded-full bg-emerald-300/80" aria-hidden />
								<span>Now</span>
							</div>
						</div>
						<div className="mt-3 text-lg font-semibold text-white">{phaseLabel}</div>
						<div className="mt-1 text-sm text-slate-300">{phaseSupport}</div>
						<p className="mt-4 text-sm leading-relaxed text-slate-200">
							{phasePrompt ?? mode.note}
						</p>
						{upcomingPhase ? (
							<div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
								<div className="text-xs uppercase tracking-[0.35em] text-slate-500">
									Next
								</div>
								<div className="mt-2 font-medium text-white">
									{upcomingPhase.label}
								</div>
								<div className="text-xs text-slate-400">
									{upcomingPhase.duration > 0
										? `${upcomingPhase.duration}s`
										: "Transition"}
								</div>
								{upcomingPhase.prompt ? (
									<p className="mt-2 text-sm text-slate-300">
										{upcomingPhase.prompt}
									</p>
								) : null}
							</div>
						) : null}
					</div>

					<div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
						<div className="flex items-center justify-between">
							<div className="text-xs uppercase tracking-[0.35em] text-slate-500">
								Audio Companion
							</div>
							<div className="flex items-center gap-2 text-xs text-slate-300">
								<span
									className={`h-2 w-2 rounded-full ${
										companionMode ? "bg-emerald-300" : "bg-slate-500/60"
									}`}
									aria-hidden
								/>
								{companionMode ? "Active" : "Standby"}
							</div>
						</div>
						<div className="mt-4 text-sm text-slate-300">
							Current backdrop ·{" "}
							<span className="font-medium text-white">{activeSoundLabel}</span>
						</div>
						<div className="mt-3 flex flex-wrap gap-2">
							{SOUNDS.map((sound) => {
								const active = sound.key === soundKey;
								return (
									<button
										key={sound.key}
										type="button"
										onClick={() => setSoundKey(sound.key)}
										className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
											active
												? "bg-white/25 text-white"
												: "bg-white/5 text-slate-200/80 hover:bg-white/10"
										}`}
										aria-pressed={active}
									>
										{sound.label}
									</button>
								);
							})}
						</div>
						<div className="mt-4 text-xs uppercase tracking-[0.35em] text-slate-500">
							Volume
						</div>
						<input
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={volume}
							onChange={(event) => setVolume(Number(event.target.value))}
							className="mt-2 w-full accent-emerald-400"
							aria-label="Background sound volume"
						/>
						<div className="mt-1 text-xs text-slate-400">
							Level · {volumePercent}%
						</div>
						<button
							type="button"
							onClick={handleCompanionToggle}
							className={`mt-4 w-full rounded-full border border-white/20 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
								companionMode
									? "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
									: "bg-white/5 text-slate-200/90 hover:bg-white/10"
							}`}
						>
							{companionMode ? "Leave Companion Mode" : "Enable Companion Mode"}
						</button>
					</div>
				</aside>
			</main>

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
				.breath-halo {
					position: absolute;
					inset: -12%;
					border-radius: 9999px;
					background: radial-gradient(
						circle at 50% 50%,
						rgba(56, 189, 248, 0.22),
						transparent 65%
					);
					filter: blur(0);
					pointer-events: none;
					animation: halo-pulse 6.5s ease-in-out infinite;
				}
				@keyframes halo-pulse {
					0%,
					100% {
						opacity: 0.65;
						transform: scale(0.96);
					}
					50% {
						opacity: 1;
						transform: scale(1.04);
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

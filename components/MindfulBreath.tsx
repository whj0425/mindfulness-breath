"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	DEFAULT_SESSION_PRESET,
	DEFAULT_SOUND_KEY,
	DEFAULT_VOLUME,
	MODES,
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
import { SoundControls } from "./mindful-breath/ui/SoundControls";

const STORAGE_KEYS = {
	sound: "mindful:sound",
	volume: "mindful:volume",
	mode: "mindful:mode",
	preset: "mindful:preset",
	companion: "mindful:companion",
} as const;

type SessionPresetKey = (typeof SESSION_PRESETS)[number]["key"];

export default function MindfulBreath() {
	const [soundOpen, setSoundOpen] = useState(false);
	const [soundKey, setSoundKey] = useState<SoundKey>(DEFAULT_SOUND_KEY);
	const [volume, setVolume] = useState(DEFAULT_VOLUME);
	const [btnPop, setBtnPop] = useState(false);
	const [companionMode, setCompanionMode] = useState(false);
	const [selectedPresetKey, setSelectedPresetKey] =
		useState<SessionPresetKey>(DEFAULT_SESSION_PRESET.key);
	const [hasHydrated, setHasHydrated] = useState(false);
	const soundButtonRef = useRef<HTMLButtonElement | null>(null);
	const soundPopoverRef = useRef<HTMLDivElement | null>(null);

	const [
		{
			mode,
			phaseKey,
			phaseElapsed,
			phaseDuration,
			progress,
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

			if (storedPreset && SESSION_PRESETS.some((preset) => preset.key === storedPreset)) {
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
		if (!soundOpen) return;
		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			const buttonEl = soundButtonRef.current;
			const popoverEl = soundPopoverRef.current;
			if (!target) return;
			if (
				(buttonEl && buttonEl.contains(target)) ||
				(popoverEl && popoverEl.contains(target))
			) {
				return;
			}
			setSoundOpen(false);
		};
		window.addEventListener("pointerdown", handlePointerDown, true);
		return () => {
			window.removeEventListener("pointerdown", handlePointerDown, true);
		};
	}, [soundOpen]);

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
		: "";
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
		<div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 antialiased selection:bg-emerald-300/30">
			<header className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between px-5 py-4">
				<div className="flex items-center gap-3">
					<div className={`h-9 w-9 rounded-2xl bg-gradient-to-tr ${mode.gradient} p-[2px]`}>
						<div className="h-full w-full rounded-2xl bg-slate-900/85 backdrop-blur" />
					</div>
					<h1 className="text-base font-semibold tracking-tight">Mindful Breath</h1>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-3">
					<div
						className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1"
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
											? "bg-white/20 text-white"
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
					<button
						type="button"
						onClick={handleCompanionToggle}
						className={`inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
							companionMode
								? "bg-emerald-500/20 text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
								: "bg-white/5 text-slate-200/80 hover:bg-white/10"
						}`}
						aria-pressed={companionMode}
						title="Keep ambient audio playing with a minimal display"
					>
						<span
							className={`h-2 w-2 rounded-full transition-opacity ${
								companionMode ? "bg-emerald-300 opacity-100" : "bg-white/60 opacity-70"
							}`}
						/>
						Audio Companion
					</button>
					<SoundControls
						open={soundOpen}
						onToggle={() => setSoundOpen((current) => !current)}
						onSelectSound={setSoundKey}
						volume={volume}
						onVolumeChange={setVolume}
						buttonRef={soundButtonRef}
						popoverRef={soundPopoverRef}
						activeKey={soundKey}
					/>
				</div>
			</header>

			<section className="fixed left-0 right-0 top-0 z-20 h-[50vh] pt-28">
				<div className="relative mx-auto flex h-full max-w-7xl items-center justify-center px-4">
					<div
						className={`relative aspect-square w-[min(76vh,720px)] max-w-[720px] ${
							!companionMode && isRunning ? "ring-pulse" : ""
						}`}
					>
						{!companionMode ? (
							<>
								<div className="absolute inset-0 grid place-items-center">
									<BreathRing
										gradient={mode.gradient}
										phase={phaseLabel}
										progress={progress}
										phaseKey={phaseKey}
										phaseElapsed={phaseElapsed}
										phaseDuration={phaseDuration}
									/>
								</div>
								<div className="absolute inset-x-0 bottom-0 flex items-center justify-center translate-y-6">
									<div className="flex items-center gap-3">
										<button
											onClick={handleStartPause}
											className={`rounded-full bg-gradient-to-br ${mode.gradient} px-6 py-3 text-sm font-medium text-white transition-transform focus:outline-none focus:ring-2 focus:ring-white/30 ${
												btnPop ? "btn-pop" : ""
											}`}
										>
											{startLabel}
										</button>
										{!isRunning && canReset ? (
											<button
												onClick={handleReset}
												className="rounded-full bg-white/5 px-4 py-3 text-xs text-slate-200/80 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
											>
												Reset
											</button>
										) : null}
									</div>
								</div>
							</>
						) : (
							<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[36px] border border-white/10 bg-slate-900/70 p-8 text-center shadow-2xl backdrop-blur">
								<div className="text-xs uppercase tracking-widest text-emerald-300/80">
									Audio Companion
								</div>
								<div className="text-lg font-semibold text-white">
									{activeSoundLabel}
								</div>
								<p className="max-w-[260px] text-sm text-slate-300">
									Ambient sound continues while the breath animation rests.
								</p>
								<div className="text-xs text-slate-400">Volume · {volumePercent}%</div>
								<div className="mt-5 flex flex-col gap-2 sm:flex-row">
									<button
										type="button"
										onClick={disableCompanionMode}
										className="rounded-full bg-emerald-500/30 px-5 py-2 text-sm font-medium text-emerald-100 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/30 hover:bg-emerald-500/40"
									>
										Return to Practice
									</button>
									<button
										type="button"
										onClick={() => {
											setSoundKey("off");
											disableCompanionMode();
										}}
										className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-slate-100/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
									>
										Stop Audio
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</section>

			<section className="fixed inset-x-0 bottom-0 z-10 h-[50vh]">
				<div className="mx-auto flex h-full max-w-7xl items-end px-4 pb-10">
					<div className="relative flex w-full flex-col items-center gap-6">
						<div className="flex w-full items-center justify-between gap-6">
							<button
								onClick={handlePrev}
								className={`group flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
									lockMode
										? "cursor-not-allowed bg-white/5/30 opacity-40"
										: "bg-white/5 hover:bg-white/10 focus:ring-2 focus:ring-white/20"
								}`}
								aria-label="Previous breathing pattern"
								disabled={lockMode}
							>
								<IconChevronLeft className="h-5 w-5 text-white/80" />
							</button>
							<div className="flex min-w-0 flex-1 flex-col items-center px-4 text-center">
								<div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${mode.gradient}`} />
								<div className="mt-3 text-lg font-semibold tracking-tight">
									{mode.name}
								</div>
								<div className="mt-1 text-sm text-slate-400">
									{mode.note} · {phaseLabel}
									{phaseSupport ? ` ${phaseSupport}` : ""}
								</div>
								<div className="mt-4 flex items-center gap-1">
									{MODES.map((pattern) => (
										<span
											key={pattern.key}
											aria-hidden
											className={`h-1.5 w-5 rounded-full transition-all ${
												pattern.key === mode.key ? "bg-white/80" : "bg-white/20"
											}`}
										/>
									))}
								</div>
								<div className="mt-5 flex w-full max-w-sm flex-col items-center gap-2">
									<div className="flex items-center gap-2 text-xs text-slate-400">
										<span>{isComplete ? "Completed" : "Remaining"}</span>
										<span className="tabular-nums text-sm text-slate-100">
											{sessionRemainingLabel}
										</span>
										<span className="text-slate-500">/ {sessionTotalLabel}</span>
									</div>
									<div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
										<div
											className={`h-full rounded-full bg-gradient-to-r ${mode.gradient} transition-[width] duration-300 ease-out`}
											style={{ width: `${progressPercent}%` }}
										/>
									</div>
									<div className="text-[0.7rem] uppercase tracking-wide text-slate-500/80">
										{selectedPreset.label} session
									</div>
									{companionMode ? (
										<div className="text-[0.7rem] uppercase tracking-wide text-emerald-300/80">
											Companion playing · {activeSoundLabel}
										</div>
									) : null}
								</div>
								{phasePrompt ? (
									<div className="mt-4 max-w-xs text-center">
										<div className="text-[0.65rem] uppercase tracking-widest text-emerald-300/80">
											Phase Cue
										</div>
										<p className="mt-1 text-sm leading-relaxed text-emerald-100/90">
											{phasePrompt}
										</p>
									</div>
								) : null}
							</div>
							<button
								onClick={handleNext}
								className={`group flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
									lockMode
										? "cursor-not-allowed bg-white/5/30 opacity-40"
										: "bg-white/5 hover:bg-white/10 focus:ring-2 focus:ring-white/20"
								}`}
								aria-label="Next breathing pattern"
								disabled={lockMode}
							>
								<IconChevronRight className="h-5 w-5 text-white/80" />
							</button>
						</div>
						{isComplete ? (
							<div
								className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl backdrop-blur"
								role="status"
								aria-live="polite"
							>
								<div className="text-xs font-semibold uppercase tracking-wide text-emerald-200/90">
									Session Complete
								</div>
								<div className="mt-2 text-lg font-semibold text-white">
									Steady and calm.
								</div>
								<p className="mt-2 text-sm text-slate-300">
									Take a breath, notice how your body feels, then choose your next step.
								</p>
								<div className="mt-3 flex flex-col gap-1 text-xs text-slate-400">
									<span>• Name one sensation you can feel.</span>
									<span>• Sip water before returning to your day.</span>
								</div>
								<div className="mt-4 text-xs text-slate-400">
									Total practice · {sessionTotalLabel}
								</div>
								<div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
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

function formatClock(seconds: number): string {
	const clamped = Math.max(0, Math.round(seconds));
	const mins = Math.floor(clamped / 60);
	const secs = clamped % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

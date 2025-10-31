"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type RefObject,
} from "react";

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
import type {
	Mode,
	SoundKey,
} from "./mindful-breath/types";
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
type ModeKey = (typeof MODES)[number]["key"];

type PhaseLiveAnnouncement = {
	key: ModeKey;
	phase: keyof typeof PHASE_LABEL;
	label: string;
};

export default function MindfulBreath() {
	const [soundKey, setSoundKey] = useState<SoundKey>(DEFAULT_SOUND_KEY);
	const [volume, setVolume] = useState(DEFAULT_VOLUME);
	const [btnPop, setBtnPop] = useState(false);
	const [companionMode, setCompanionMode] = useState(false);
	const [selectedPresetKey, setSelectedPresetKey] =
		useState<SessionPresetKey>(DEFAULT_SESSION_PRESET.key);
	const [hasHydrated, setHasHydrated] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [phaseAnnouncement, setPhaseAnnouncement] =
		useState<PhaseLiveAnnouncement | null>(null);

	const settingsInitialFocusRef = useRef<HTMLButtonElement | null>(null);
	const scrollLockRef = useRef<{ root: string; body: string } | null>(null);

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
			const storedCompanion = window.localStorage.getItem(
				STORAGE_KEYS.companion,
			);

			let resolvedSoundKey: SoundKey | null = null;
			if (storedSound && SOUNDS.some((sound) => sound.key === storedSound)) {
				resolvedSoundKey = storedSound as SoundKey;
				setSoundKey(resolvedSoundKey);
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
				const preset = SESSION_PRESETS.find(
					(item) => item.key === storedPreset,
				);
				if (preset) {
					setSessionDuration(preset.duration);
				}
			}

			if (storedCompanion === "true") {
				let effectiveSound = resolvedSoundKey ?? DEFAULT_SOUND_KEY;
				if (effectiveSound === "off") {
					effectiveSound = DEFAULT_SOUND_KEY;
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
	}, [pauseTimer, prepareForStart, setModeIndex, setSessionDuration]);

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

	const handleSelectModeKey = useCallback(
		(modeKey: ModeKey) => {
			if (sessionLocked) return;
			const nextIndex = MODES.findIndex((pattern) => pattern.key === modeKey);
			if (nextIndex >= 0) {
				setModeIndex(() => nextIndex);
				resetTimer();
			}
		},
		[resetTimer, sessionLocked, setModeIndex],
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
			if (isSettingsOpen) return;
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
	}, [handleNext, handlePrev, handleStartPause, isSettingsOpen, sessionLocked]);

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

	useEffect(() => {
		setPhaseAnnouncement({
			key: mode.key,
			phase: phaseKey,
			label: PHASE_LABEL[phaseKey],
		});
	}, [mode.key, phaseKey]);

	useEffect(() => {
		if (!isSettingsOpen) return;
		settingsInitialFocusRef.current?.focus({ preventScroll: true });
	}, [isSettingsOpen]);

	useEffect(() => {
		if (typeof document === "undefined") return;
		const root = document.documentElement;
		const body = document.body;
		if (isSettingsOpen) {
			if (!scrollLockRef.current) {
				scrollLockRef.current = {
					root: root.style.overflow,
					body: body.style.overflow,
				};
			}
			root.style.overflow = "hidden";
			body.style.overflow = "hidden";
			return () => {
				if (!scrollLockRef.current) return;
				root.style.overflow = scrollLockRef.current.root;
				body.style.overflow = scrollLockRef.current.body;
				scrollLockRef.current = null;
			};
		}
		if (scrollLockRef.current) {
			root.style.overflow = scrollLockRef.current.root;
			body.style.overflow = scrollLockRef.current.body;
			scrollLockRef.current = null;
		} else {
			root.style.overflow = "";
			body.style.overflow = "";
		}
	}, [isSettingsOpen]);

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
	const sessionSummary = `${selectedPreset.label} · ${mode.name} · ${
		soundKey === "off" ? "Sound off" : activeSoundLabel
	}`;

	return (
		<div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-slate-100 antialiased selection:bg-emerald-300/30">
			<DecorativeBackgroundLite />

			<div className="relative flex min-h-screen w-full flex-col px-6 py-8 sm:px-10 lg:px-20">
					<header className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-6">
						<span className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
							Mindful Breath
						</span>
						<div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
							{!companionMode ? (
								<button
									type="button"
									onClick={() => setIsSettingsOpen(true)}
									className="flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 sm:h-11 sm:px-5 sm:text-[0.65rem]"
								>
									Session Settings
								</button>
							) : null}
							<button
								type="button"
								onClick={handleCompanionToggle}
								className={`flex h-10 items-center justify-center rounded-full border border-white/20 px-4 text-[0.6rem] font-semibold uppercase tracking-[0.35em] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 sm:h-11 sm:px-5 sm:text-[0.65rem] ${
									companionMode
									? "bg-emerald-500/25 text-emerald-100 hover:bg-emerald-500/35"
									: "bg-white/5 text-slate-100/90 hover:bg-white/10"
							}`}
								aria-pressed={companionMode}
							>
								{companionMode ? "Companion On" : "Companion Off"}
							</button>
						</div>
					</header>


				<main
					className={`flex flex-1 justify-center py-10 ${
						companionMode ? "items-center" : ""
					}`}
				>
					{companionMode ? (
						<div className="flex w-full flex-1 items-center justify-center">
							<div className="rounded-full border border-white/15 bg-white/5 px-8 py-4 text-xs font-semibold uppercase tracking-[0.4em] text-white/80 shadow-[0_8px_30px_rgba(15,118,110,0.2)]">
								Companion Mode
							</div>
						</div>
					) : (
						<div className="mx-auto flex w-full max-w-[1500px] flex-col items-center gap-10 lg:gap-16">
							<div className="flex flex-col items-center gap-3 text-center">
								<h1 className="text-[clamp(1.6rem,3.6vw,2.6rem)] font-semibold tracking-tight text-white">
									{mode.name}
								</h1>
							</div>

							<div className="grid w-full gap-8 text-center lg:grid-cols-[minmax(360px,1fr)_minmax(320px,auto)_minmax(360px,1fr)] lg:items-start lg:gap-20 lg:text-left">
								<div className="flex w-full max-w-[520px] flex-col items-start gap-3 self-start text-sm text-slate-300/85">
									<span className="text-xs uppercase tracking-[0.35em] text-white/60">
										Session
									</span>
									<p className="min-h-[1.75rem] w-full text-slate-300">
										{sessionSummary}
									</p>
									<div className="flex items-baseline gap-3">
										<span className="text-3xl font-semibold text-white">
											{sessionRemainingLabel}
										</span>
										<span className="text-xs uppercase tracking-[0.35em] text-slate-400">
											of {sessionTotalLabel}
										</span>
									</div>
									<div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
										<div
											className={`h-full rounded-full bg-gradient-to-r ${mode.gradient} transition-[width] duration-300 ease-out`}
											style={{ width: `${progressPercent}%` }}
										/>
									</div>
									<div className="flex w-full justify-between text-xs text-slate-400">
										<span>{phaseLabel}</span>
										<span>{phaseSupport}</span>
									</div>
								</div>

								<div className="flex flex-col items-center gap-8">
									<div className="relative grid place-items-center">
										<BreathRing
											gradient={mode.gradient}
											phaseKey={phaseKey}
											phaseElapsed={phaseElapsed}
											phaseDuration={phaseDuration}
										/>
									</div>
									<div className="-mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
										<button
											type="button"
											onClick={handleStartPause}
											className={`flex h-12 min-w-[150px] items-center justify-center rounded-full bg-gradient-to-r ${mode.gradient} px-9 text-base font-semibold text-white shadow-[0_12px_40px_rgba(56,189,248,0.25)] transition-transform focus:outline-none focus:ring-2 focus:ring-white/30 ${
												btnPop ? "btn-pop" : ""
											}`}
										>
											{startLabel}
										</button>
										{!isRunning && canReset ? (
											<button
												type="button"
												onClick={handleReset}
												className="flex h-12 min-w-[150px] items-center justify-center rounded-full border border-white/20 bg-white/5 px-9 text-base font-semibold text-white/85 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/25"
											>
												Reset
											</button>
										) : null}
									</div>
								</div>

								<div className="flex w-full max-w-[520px] flex-col items-end gap-2 self-start text-sm text-slate-300/85 lg:text-right">
									<span className="self-end text-xs uppercase tracking-[0.35em] text-white/60">
										Guidance
									</span>
									<p className="min-h-[1.75rem] w-full text-slate-200">
										{phasePrompt ?? "Settle into the rhythm and follow each breath."}
									</p>
									{upcomingPhase ? (
										<div className="flex w-full flex-col items-end gap-1 text-xs text-slate-400">
											<span className="text-xs font-medium uppercase tracking-[0.35em] text-white/70">
												Up next · {upcomingPhase.label}
											</span>
											<span>
												{upcomingPhase.duration > 0
													? `${upcomingPhase.duration}s`
													: "Transition"}
											</span>
											{upcomingPhase.prompt ? (
												<span className="text-[0.7rem] text-slate-400/80">
													{upcomingPhase.prompt}
												</span>
											) : null}
										</div>
									) : (
										<div className="min-h-[1.75rem]" />
									)}
								</div>
							</div>
						</div>
					)}
				</main>
			</div>

			{isSettingsOpen ? (
				<SettingsSheet
					onClose={() => setIsSettingsOpen(false)}
					initialFocusRef={settingsInitialFocusRef}
					mode={mode}
					selectedPresetKey={selectedPresetKey}
					sessionLocked={sessionLocked}
					onSelectPreset={handleSelectPreset}
					onSelectMode={handleSelectModeKey}
					soundKey={soundKey}
					onSelectSound={setSoundKey}
					volume={volume}
					onVolumeChange={setVolume}
					canUseShortcuts={!sessionLocked}
					prevMode={handlePrev}
					nextMode={handleNext}
				/>
			) : null}

			<div
				aria-live="polite"
				className="sr-only"
			>
				{phaseAnnouncement ? `${phaseAnnouncement.label} phase` : ""}
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

type SettingsSheetProps = {
	onClose: () => void;
	initialFocusRef: RefObject<HTMLButtonElement>;
	mode: Mode;
	selectedPresetKey: SessionPresetKey;
	sessionLocked: boolean;
	onSelectPreset: (key: SessionPresetKey) => void;
	onSelectMode: (key: ModeKey) => void;
	soundKey: SoundKey;
	onSelectSound: (key: SoundKey) => void;
	volume: number;
	onVolumeChange: (value: number) => void;
	canUseShortcuts: boolean;
	prevMode: () => void;
	nextMode: () => void;
};

function SettingsSheet({
	onClose,
	initialFocusRef,
	mode,
	selectedPresetKey,
	sessionLocked,
	onSelectPreset,
	onSelectMode,
	soundKey,
	onSelectSound,
	volume,
	onVolumeChange,
	canUseShortcuts,
	prevMode,
	nextMode,
}: SettingsSheetProps) {
	return (
		<div
			className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
			role="dialog"
			aria-modal="true"
			aria-label="Session settings"
		>
			<button
				type="button"
				onClick={onClose}
				className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
				aria-hidden
			/>
			<div className="relative w-full max-w-[720px] rounded-t-[32px] border border-white/15 bg-slate-950/95 px-6 py-8 shadow-2xl backdrop-blur-lg sm:rounded-3xl sm:px-10">
				<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-xl font-semibold text-white">Session settings</h2>
					</div>
					<div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
						<button
							type="button"
							onClick={prevMode}
							disabled={sessionLocked}
							className={`hidden h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 sm:flex ${
								sessionLocked
									? "cursor-not-allowed opacity-40"
									: "bg-white/5 hover:bg-white/10"
							}`}
							aria-label="Previous breathing pattern"
						>
							<IconChevronLeft className="h-4 w-4" />
						</button>
						<button
							type="button"
							onClick={nextMode}
							disabled={sessionLocked}
							className={`hidden h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 sm:flex ${
								sessionLocked
									? "cursor-not-allowed opacity-40"
									: "bg-white/5 hover:bg-white/10"
							}`}
							aria-label="Next breathing pattern"
						>
							<IconChevronRight className="h-4 w-4" />
						</button>
					</div>
				</div>

				<div className="max-h-[65vh] space-y-8 overflow-y-auto overscroll-contain pr-1 sm:max-h-[70vh]">
					<section>
						<header className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/60">
							<span>Breathing rhythm</span>
							{sessionLocked ? (
								<span className="text-[0.6rem] text-amber-300/80">
									Lock lifts after reset
								</span>
							) : null}
						</header>
						<div className="flex flex-col gap-3">
							{MODES.map((pattern) => {
								const active = pattern.key === mode.key;
								return (
									<button
										key={pattern.key}
										type="button"
										onClick={() => onSelectMode(pattern.key)}
										disabled={sessionLocked}
										className={`w-full rounded-3xl border border-white/10 px-5 py-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
											active
												? "bg-white/10 text-white"
												: "bg-white/0 text-slate-200/90 hover:bg-white/5"
										}`}
										aria-pressed={active}
									>
										<div className="flex items-center justify-between">
											<span className="text-base font-semibold text-white">
												{pattern.name}
											</span>
											<span className="text-xs uppercase tracking-[0.3em] text-white/50">
												{pattern.key.replace(/-/g, " ")}
											</span>
										</div>
										{pattern.note ? (
											<p className="mt-2 text-sm text-slate-300/90">
												{pattern.note}
											</p>
										) : null}
									</button>
								);
							})}
						</div>
					</section>

					<section>
						<header className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/60">
							<span>Soundscape</span>
							<span className="text-[0.6rem] text-slate-400">
								Plays on start or in companion mode
							</span>
						</header>
						<div className="flex flex-wrap gap-2">
							{SOUNDS.map((sound) => {
								const active = sound.key === soundKey;
								return (
									<button
										key={sound.key}
										type="button"
										onClick={() => onSelectSound(sound.key)}
										className={`flex h-9 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
											active
												? "bg-emerald-500/25 text-emerald-100"
												: "bg-white/5 text-slate-200/80 hover:bg-white/10"
										}`}
										aria-pressed={active}
									>
										{sound.label}
									</button>
								);
							})}
						</div>
						<label className="mt-4 flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
							<span>Volume</span>
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={volume}
								onChange={(event) => onVolumeChange(Number(event.target.value))}
								className="accent-emerald-400"
								aria-label="Background volume"
								disabled={soundKey === "off"}
							/>
							<span className="text-[0.65rem] text-slate-500">
								Level {Math.round(volume * 100)}%
							</span>
						</label>
					</section>

					<section>
						<header className="mb-3 text-xs uppercase tracking-[0.35em] text-white/60">
							<span>Session duration</span>
						</header>
						<div
							className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1"
							role="group"
							aria-label="Select session duration"
						>
							{SESSION_PRESETS.map((preset) => {
								const isActive = preset.key === selectedPresetKey;
								return (
									<button
										type="button"
										key={preset.key}
										onClick={() => onSelectPreset(preset.key)}
										disabled={sessionLocked}
										className={`flex h-10 min-w-[90px] items-center justify-center rounded-full border px-4 text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
											isActive
												? "border-emerald-300/50 bg-emerald-500/25 text-emerald-100 shadow-[0_8px_24px_rgba(45,212,191,0.28)]"
												: "border-white/10 text-slate-200/80 hover:bg-white/10"
										}`}
										aria-pressed={isActive}
									>
										{preset.label}
									</button>
								);
							})}
						</div>
					</section>
				</div>

				<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="text-xs text-slate-500">
						{canUseShortcuts ? "Use ← → to switch patterns." : "Reset to switch patterns."}
					</div>
					<button
						type="button"
						onClick={onClose}
						ref={initialFocusRef}
						className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-6 py-2 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.35)] transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-emerald-200"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	);
}

function formatClock(seconds: number): string {
	const clamped = Math.max(0, Math.round(seconds));
	const mins = Math.floor(clamped / 60);
	const secs = clamped % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

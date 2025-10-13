"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
	DEFAULT_SOUND_KEY,
	DEFAULT_VOLUME,
	MODES,
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

export default function MindfulBreath() {
	const [soundOpen, setSoundOpen] = useState(false);
	const [soundKey, setSoundKey] = useState<SoundKey>(DEFAULT_SOUND_KEY);
	const [volume, setVolume] = useState(DEFAULT_VOLUME);
	const [btnPop, setBtnPop] = useState(false);
	const soundButtonRef = useRef<HTMLButtonElement | null>(null);
	const soundPopoverRef = useRef<HTMLDivElement | null>(null);

	const [
		{ mode, phaseKey, phaseElapsed, phaseDuration, progress, isRunning },
		{ start: startTimer, pause: pauseTimer, reset: resetTimer, nextMode, prevMode },
	] = useBreathTimer();

	const { prepareForStart, pauseAmbient } = useAmbientAudio({
		soundKey,
		isRunning,
		volume,
	});

	const handleStart = useCallback(async () => {
		setBtnPop(true);
		window.setTimeout(() => setBtnPop(false), 300);
		if (isRunning) return;
		await prepareForStart(soundKey);
		startTimer();
	}, [isRunning, prepareForStart, soundKey, startTimer]);

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
		if (isRunning) return;
		prevMode();
		resetTimer();
	}, [isRunning, prevMode, resetTimer]);

	const handleNext = useCallback(() => {
		if (isRunning) return;
		nextMode();
		resetTimer();
	}, [isRunning, nextMode, resetTimer]);

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
			}
			if (!isRunning && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
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
	}, [handleNext, handlePrev, handleStartPause, isRunning]);

	const lockMode = isRunning;
	const phaseLabel = PHASE_LABEL[phaseKey];
	const phaseSupport = phaseDuration
		? `${Math.max(0, Math.ceil(phaseDuration - phaseElapsed))}s remaining`
		: "";

	return (
		<div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 antialiased selection:bg-emerald-300/30">
			<header className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between px-5 py-4">
				<div className="flex items-center gap-3">
					<div className={`h-9 w-9 rounded-2xl bg-gradient-to-tr ${mode.gradient} p-[2px]`}>
						<div className="h-full w-full rounded-2xl bg-slate-900/85 backdrop-blur" />
					</div>
					<h1 className="text-base font-semibold tracking-tight">Mindful Breath</h1>
				</div>
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
			</header>

			<section className="fixed left-0 right-0 top-0 z-20 h-[50vh] pt-28">
				<div className="relative mx-auto flex h-full max-w-7xl items-center justify-center px-4">
					<div className={`relative aspect-square w-[min(76vh,720px)] max-w-[720px] ${isRunning ? "ring-pulse" : ""}`}>
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
									{isRunning ? "Pause" : "Begin"}
								</button>
								{!isRunning ? (
									<button
										onClick={handleReset}
										className="rounded-full bg-white/5 px-4 py-3 text-xs text-slate-200/80 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
									>
										Reset
									</button>
								) : null}
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="fixed inset-x-0 bottom-0 z-10 h-[50vh]">
				<div className="mx-auto flex h-full max-w-7xl items-end px-4 pb-10">
					<div className="relative flex w-full items-center justify-between gap-6">
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
							<div className="mt-3 text-lg font-semibold tracking-tight">{mode.name}</div>
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

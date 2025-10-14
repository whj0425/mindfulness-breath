import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	DEFAULT_MODE_INDEX,
	DEFAULT_SESSION_DURATION,
	LABEL,
	MODES,
	ORDER,
} from "../constants";
import type { Mode, PhaseKey } from "../types";

type UseBreathTimerOptions = {
	initialModeIndex?: number;
	initialSessionDurationSec?: number;
	onComplete?: () => void;
};

export type BreathTimerState = {
	modeIndex: number;
	mode: Mode;
	phaseKey: PhaseKey;
	phaseElapsed: number;
	phaseDuration: number;
	progress: number;
	isRunning: boolean;
	sessionDuration: number;
	sessionElapsed: number;
	sessionRemaining: number;
	sessionProgress: number;
	isComplete: boolean;
};

export type BreathTimerControls = {
	start: () => void;
	pause: () => void;
	reset: () => void;
	nextMode: () => void;
	prevMode: () => void;
	setModeIndex: (updater: (current: number) => number) => void;
	setSessionDuration: (durationSec: number) => void;
};

export function useBreathTimer(
	options: UseBreathTimerOptions = {},
): [BreathTimerState, BreathTimerControls] {
	const sanitizeDuration = useCallback(
		(value: number | undefined) => {
			if (typeof value !== "number" || Number.isNaN(value)) {
				return DEFAULT_SESSION_DURATION;
			}
			return Math.max(30, Math.round(value));
		},
		[],
	);

	const initialModeIndex = options.initialModeIndex ?? DEFAULT_MODE_INDEX;
	const initialSessionDuration = sanitizeDuration(
		options.initialSessionDurationSec,
	);

	const [modeIndex, setModeIndexState] = useState(initialModeIndex);
	const [isRunning, setIsRunning] = useState(false);
	const [phaseIdx, setPhaseIdx] = useState(0);
	const [phaseElapsed, setPhaseElapsed] = useState(0);
	const [sessionDuration, setSessionDurationState] = useState(
		initialSessionDuration,
	);
	const [sessionElapsed, setSessionElapsed] = useState(0);
	const [completed, setCompleted] = useState(false);

	const rafRef = useRef<number | null>(null);
	const lastTsRef = useRef<number | null>(null);
	const runningRef = useRef(false);
	const modeRef = useRef(MODES[initialModeIndex]);
	const phaseIdxRef = useRef(phaseIdx);
	const phaseElapsedRef = useRef(phaseElapsed);
	const sessionDurationRef = useRef(sessionDuration);
	const sessionElapsedRef = useRef(sessionElapsed);
	const completionRef = useRef(completed);
	const onCompleteRef = useRef<UseBreathTimerOptions["onComplete"]>(
		options.onComplete,
	);

	useEffect(() => {
		onCompleteRef.current = options.onComplete;
	}, [options.onComplete]);

	useEffect(() => {
		modeRef.current = MODES[modeIndex];
	}, [modeIndex]);

	useEffect(() => {
		runningRef.current = isRunning;
	}, [isRunning]);

	useEffect(() => {
		phaseIdxRef.current = phaseIdx;
	}, [phaseIdx]);

	useEffect(() => {
		phaseElapsedRef.current = phaseElapsed;
	}, [phaseElapsed]);

	useEffect(() => {
		sessionDurationRef.current = sessionDuration;
	}, [sessionDuration]);

	useEffect(() => {
		sessionElapsedRef.current = sessionElapsed;
	}, [sessionElapsed]);

	useEffect(() => {
		completionRef.current = completed;
	}, [completed]);

	const stopRaf = useCallback(() => {
		if (rafRef.current != null) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}
	}, []);

	const tick = useCallback((ts: number) => {
		if (!runningRef.current) return;
		if (lastTsRef.current == null) {
			lastTsRef.current = ts;
		}
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

		const nextSessionElapsed = sessionElapsedRef.current + dt;
		const duration = sessionDurationRef.current;
		if (duration > 0 && nextSessionElapsed >= duration) {
			const clampedElapsed = Math.min(nextSessionElapsed, duration);
			sessionElapsedRef.current = clampedElapsed;
			setSessionElapsed(clampedElapsed);
			runningRef.current = false;
			setIsRunning(false);
			rafRef.current = null;
			lastTsRef.current = null;
			completionRef.current = true;
			setCompleted(true);
			window.setTimeout(() => {
				if (onCompleteRef.current) {
					onCompleteRef.current();
				}
			}, 0);
			return;
		}

		sessionElapsedRef.current = nextSessionElapsed;
		setSessionElapsed(nextSessionElapsed);

		rafRef.current = window.requestAnimationFrame(tick);
	}, []);

	const start = useCallback(() => {
		if (runningRef.current) return;
		if (completionRef.current) {
			completionRef.current = false;
			setCompleted(false);
			setPhaseIdx(0);
			setPhaseElapsed(0);
			phaseIdxRef.current = 0;
			phaseElapsedRef.current = 0;
			sessionElapsedRef.current = 0;
			setSessionElapsed(0);
		}
		runningRef.current = true;
		setIsRunning(true);
		lastTsRef.current = null;
		rafRef.current = window.requestAnimationFrame(tick);
	}, [tick]);

	const pause = useCallback(() => {
		if (!runningRef.current) return;
		runningRef.current = false;
		setIsRunning(false);
		stopRaf();
		lastTsRef.current = null;
	}, [stopRaf]);

	const reset = useCallback(() => {
		pause();
		setPhaseIdx(0);
		setPhaseElapsed(0);
		phaseIdxRef.current = 0;
		phaseElapsedRef.current = 0;
		sessionElapsedRef.current = 0;
		setSessionElapsed(0);
		completionRef.current = false;
		setCompleted(false);
	}, [pause]);

	const setModeIndex = useCallback(
		(updater: (current: number) => number) => {
			setModeIndexState((current) => {
				const next = updater(current);
				return (next + MODES.length) % MODES.length;
			});
		},
		[],
	);

	const nextMode = useCallback(() => {
		setModeIndex((current) => current + 1);
	}, [setModeIndex]);

	const prevMode = useCallback(() => {
		setModeIndex((current) => current - 1);
	}, [setModeIndex]);

	const setSessionDuration = useCallback(
		(durationSec: number) => {
			const sanitized = sanitizeDuration(durationSec);
			setSessionDurationState(sanitized);
			sessionDurationRef.current = sanitized;
			sessionElapsedRef.current = 0;
			setSessionElapsed(0);
			completionRef.current = false;
			setCompleted(false);
			setPhaseIdx(0);
			setPhaseElapsed(0);
			phaseIdxRef.current = 0;
			phaseElapsedRef.current = 0;
		},
		[sanitizeDuration],
	);

	useEffect(
		() => () => {
			runningRef.current = false;
			stopRaf();
		},
		[stopRaf],
	);

	const mode = MODES[modeIndex];
	const phaseKey = ORDER[phaseIdx];
	const phaseDuration = mode.phases[phaseKey];

	const progress = useMemo(() => {
		const p = phaseDuration > 0 ? phaseElapsed / phaseDuration : 1;
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
	}, [phaseDuration, phaseElapsed, phaseKey]);

	return [
		{
			modeIndex,
			mode,
			phaseKey,
			phaseElapsed,
			phaseDuration,
			progress,
			isRunning,
			sessionDuration,
			sessionElapsed,
			sessionRemaining: Math.max(0, sessionDuration - sessionElapsed),
			sessionProgress:
				sessionDuration > 0 ? Math.min(1, sessionElapsed / sessionDuration) : 0,
			isComplete: completed,
		},
		{
			start,
			pause,
			reset,
			nextMode,
			prevMode,
			setModeIndex,
			setSessionDuration,
		},
	];
}

export const PHASE_LABEL = LABEL;

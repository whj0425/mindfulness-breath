import { useCallback, useEffect, useRef } from "react";

import { prepareLoopBuffer } from "@/lib/audio-loop";

import {
	AMBIENT_TRACKS,
	AUDIO_CONTEXT_CLOSE_DELAY,
	FADE_TAU,
	MASTER_FADE_TAU,
	STOP_DELAY,
} from "../constants";
import type {
	ActiveSoundKey,
	RandomSlicePlaybackConfig,
	PlaybackConfig,
	SoundKey,
} from "../types";

type ActiveGrain = { source: AudioBufferSourceNode; gain: GainNode };

type TrackBag = {
	gain: GainNode;
	buffer?: AudioBuffer;
	loopStart?: number;
	loopEnd?: number;
	source?: AudioBufferSourceNode;
	grains?: Set<ActiveGrain>;
	nextGrainTime?: number;
	scheduleHandle?: number;
	playbackType?: PlaybackConfig["type"];
	loading?: Promise<AudioBuffer | null>;
};

type AudioBag = {
	ctx: AudioContext;
	master: GainNode;
	tracks: Record<ActiveSoundKey, TrackBag>;
	currentKey: ActiveSoundKey | null;
};

type UseAmbientAudioOptions = {
	soundKey: SoundKey;
	isRunning: boolean;
	volume: number;
};

type UseAmbientAudioResult = {
	prepareForStart: (key: SoundKey) => Promise<void>;
	pauseAmbient: () => void;
};

export function useAmbientAudio({
	soundKey,
	isRunning,
	volume,
}: UseAmbientAudioOptions): UseAmbientAudioResult {
	const audioRef = useRef<AudioBag | null>(null);
	const volumeRef = useRef(volume);
	const suspendTimeoutRef = useRef<number | null>(null);

	useEffect(() => {
		volumeRef.current = volume;
	}, [volume]);

	const ensureAudio = useCallback(async (): Promise<AudioBag | null> => {
		try {
			if (typeof window === "undefined") return null;
			if (audioRef.current) {
				try {
					await audioRef.current.ctx.resume();
				} catch {
					// ignored
				}
				return audioRef.current;
			}

			const AudioCtx =
				window.AudioContext ||
				(window as typeof window & {
					webkitAudioContext?: typeof AudioContext;
				}).webkitAudioContext;
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

			const tracks = AMBIENT_TRACKS.reduce<Record<ActiveSoundKey, TrackBag>>(
				(acc, track) => {
					const gain = ctx.createGain();
					gain.gain.value = 0;
					gain.connect(master);
					acc[track.key] = { gain };
					return acc;
				},
				{} as Record<ActiveSoundKey, TrackBag>,
			);

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
	}, []);

	const loadTrackBuffer = useCallback(
		async (audio: AudioBag, key: ActiveSoundKey) => {
			const track = audio.tracks[key];
			if (!track) return null;
			if (track.buffer) return track.buffer;
			if (!track.loading) {
				const config = AMBIENT_TRACKS.find((t) => t.key === key);
				if (!config) return null;
				track.loading = (async () => {
					try {
						const res = await fetch(config.file);
						const arrayBuffer = await res.arrayBuffer();
						const rawBuffer = await audio.ctx.decodeAudioData(arrayBuffer);
						const { buffer, loopStart, loopEnd } = prepareLoopBuffer(
							audio.ctx,
							rawBuffer,
						);
						track.buffer = buffer;
						track.loopStart = loopStart;
						track.loopEnd = loopEnd;
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
		},
		[],
	);

	const stopDynamicPlayback = useCallback((bag: TrackBag, now: number) => {
		if (bag.scheduleHandle != null) {
			window.clearTimeout(bag.scheduleHandle);
			bag.scheduleHandle = undefined;
		}
		if (bag.grains) {
			bag.grains.forEach(({ source, gain }) => {
				try {
					gain.gain.cancelScheduledValues(now);
					gain.gain.setTargetAtTime(0, now, FADE_TAU);
					source.stop(now + STOP_DELAY);
				} catch {
					// ignored
				}
				try {
					gain.disconnect();
				} catch {
					// ignored
				}
			});
			bag.grains.clear();
			bag.grains = undefined;
		}
		bag.nextGrainTime = undefined;
		bag.playbackType = undefined;
	}, []);

	const ensureRandomSlicePlayback = useCallback(
		(
			audio: AudioBag,
			bag: TrackBag,
			buffer: AudioBuffer,
			config: RandomSlicePlaybackConfig,
		) => {
			const scheduleAhead = config.scheduleAhead ?? 5;
			const minRatio = Math.min(Math.max(config.minRatio, 0.05), 1);
			const maxRatio = config.maxRatio
				? Math.max(minRatio, Math.min(config.maxRatio, 1))
				: minRatio;
			const baseFade = Math.max(0, Math.min(config.fadeDuration, buffer.duration / 3));

			const schedule = () => {
				bag.scheduleHandle = undefined;
				const now = audio.ctx.currentTime;
				let nextTime = bag.nextGrainTime ?? now;
				if (!bag.grains) {
					bag.grains = new Set();
				}

				while (nextTime < now + scheduleAhead) {
					const ratio = minRatio + Math.random() * (maxRatio - minRatio);
					const sliceDuration = Math.min(
						buffer.duration,
						buffer.duration * ratio,
					);
					if (sliceDuration <= 0) break;
					const fade = Math.min(baseFade, sliceDuration / 3);
					const playable = Math.max(0, buffer.duration - sliceDuration);
					const offset = playable > 0 ? Math.random() * playable : 0;

					const source = audio.ctx.createBufferSource();
					source.buffer = buffer;

					const sliceGain = audio.ctx.createGain();
					if (fade > 0) {
						sliceGain.gain.setValueAtTime(0, nextTime);
						sliceGain.gain.linearRampToValueAtTime(1, nextTime + fade);
						const sustainEnd = nextTime + sliceDuration - fade;
						if (sustainEnd > nextTime + fade) {
							sliceGain.gain.setValueAtTime(1, sustainEnd);
						}
						sliceGain.gain.linearRampToValueAtTime(
							0,
							nextTime + sliceDuration,
						);
					} else {
						sliceGain.gain.setValueAtTime(1, nextTime);
						sliceGain.gain.setValueAtTime(
							1,
							nextTime + sliceDuration,
						);
					}

					source.connect(sliceGain);
					sliceGain.connect(bag.gain);
					source.start(nextTime, offset, sliceDuration);
					source.stop(nextTime + sliceDuration);

					const grain: ActiveGrain = { source, gain: sliceGain };
					bag.grains?.add(grain);

					source.onended = () => {
						try {
							sliceGain.disconnect();
						} catch {
							// ignored
						}
						bag.grains?.delete(grain);
						if (!bag.grains?.size) {
							bag.grains = undefined;
						}
					};

					const spacing =
						fade > 0
							? Math.max(sliceDuration - fade, sliceDuration * 0.6)
							: sliceDuration;
					nextTime += spacing;
				}

				bag.nextGrainTime = nextTime;
				bag.scheduleHandle = window.setTimeout(schedule, 300);
			};

			if (bag.scheduleHandle != null) {
				return;
			}

			bag.grains = bag.grains ?? new Set();
			bag.nextGrainTime = bag.nextGrainTime ?? audio.ctx.currentTime;
			schedule();
		},
		[],
	);

	const fadeOutAll = useCallback(
		(audio: AudioBag) => {
			const now = audio.ctx.currentTime;
			Object.values(audio.tracks).forEach((track) => {
				track.gain.gain.cancelScheduledValues(now);
				track.gain.gain.setTargetAtTime(0, now, FADE_TAU);
				if (track.playbackType && track.playbackType !== "loop") {
					stopDynamicPlayback(track, now);
				} else if (track.source) {
					try {
						track.source.stop(now + STOP_DELAY);
					} catch {
						// ignored
					}
					track.source = undefined;
				}
			});
		},
		[stopDynamicPlayback],
	);

	const playAmbient = useCallback(
		async (audio: AudioBag, key: ActiveSoundKey) => {
			const trackConfig = AMBIENT_TRACKS.find((t) => t.key === key);
			if (!trackConfig) return;

			const now = audio.ctx.currentTime;

			Object.entries(audio.tracks).forEach(([trackKey, track]) => {
				if (trackKey === key) return;
				track.gain.gain.cancelScheduledValues(now);
				track.gain.gain.setTargetAtTime(0, now, FADE_TAU);
				if (track.playbackType && track.playbackType !== "loop") {
					stopDynamicPlayback(track, now);
				} else if (track.source) {
					try {
						track.source.stop(now + STOP_DELAY);
					} catch {
						// ignored
					}
					track.source = undefined;
				}
			});

			const bag = audio.tracks[key];
			if (!bag) return;

			const buffer = await loadTrackBuffer(audio, key);
			if (!buffer) return;

			const playback: PlaybackConfig = trackConfig.playback ?? { type: "loop" };
			bag.playbackType = playback.type;

			if (playback.type === "randomSlice") {
				if (bag.source) {
					try {
						bag.source.stop(now + STOP_DELAY);
					} catch {
						// ignored
					}
					bag.source = undefined;
				}
				ensureRandomSlicePlayback(audio, bag, buffer, playback);
			} else {
				stopDynamicPlayback(bag, now);
				if (!bag.source) {
					const source = audio.ctx.createBufferSource();
					source.buffer = buffer;
					source.loop = true;
					if (
						bag.loopStart != null &&
						bag.loopEnd != null &&
						bag.loopEnd > bag.loopStart
					) {
						source.loopStart = bag.loopStart;
						source.loopEnd = bag.loopEnd;
					}
					source.connect(bag.gain);
					source.start();
					source.onended = () => {
						if (bag.source === source) {
							bag.source = undefined;
						}
					};
					bag.source = source;
				}
			}

			bag.gain.gain.cancelScheduledValues(now);
			bag.gain.gain.setTargetAtTime(trackConfig.gain ?? 1, now, FADE_TAU);
			audio.currentKey = key;
		},
		[ensureRandomSlicePlayback, loadTrackBuffer, stopDynamicPlayback],
	);

	const pauseAmbient = useCallback(() => {
		const audio = audioRef.current;
		if (!audio) return;
		if (suspendTimeoutRef.current != null) {
			window.clearTimeout(suspendTimeoutRef.current);
			suspendTimeoutRef.current = null;
		}
		fadeOutAll(audio);
		try {
			suspendTimeoutRef.current = window.setTimeout(() => {
				suspendTimeoutRef.current = null;
				try {
					void audio.ctx.suspend();
				} catch {
					// ignored
				}
			}, Math.round(AUDIO_CONTEXT_CLOSE_DELAY * 1000));
		} catch {
			// ignored
		}
	}, [fadeOutAll]);

	const prepareForStart = useCallback(
		async (key: SoundKey) => {
			if (key === "off") return;
			const audio = await ensureAudio();
			if (!audio) return;
			await loadTrackBuffer(audio, key as ActiveSoundKey);
		},
		[ensureAudio, loadTrackBuffer],
	);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const audio = await ensureAudio();
			if (!audio || cancelled) return;
			const now = audio.ctx.currentTime;
			audio.master.gain.cancelScheduledValues(now);
			audio.master.gain.setTargetAtTime(volumeRef.current, now, MASTER_FADE_TAU);
			const activeKey =
				soundKey === "off" ? null : (soundKey as ActiveSoundKey);
			if (activeKey) {
				void loadTrackBuffer(audio, activeKey);
			}
			if (!isRunning || !activeKey) {
				fadeOutAll(audio);
				return;
			}
			await playAmbient(audio, activeKey);
		})();

		return () => {
			cancelled = true;
		};
	}, [
		ensureAudio,
		fadeOutAll,
		isRunning,
		loadTrackBuffer,
		playAmbient,
		soundKey,
	]);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		const now = audio.ctx.currentTime;
		audio.master.gain.cancelScheduledValues(now);
		audio.master.gain.setTargetAtTime(volumeRef.current, now, MASTER_FADE_TAU);
	}, [volume]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const audio = await ensureAudio();
			if (!audio || cancelled) return;
			AMBIENT_TRACKS.forEach(({ key }) => {
				void loadTrackBuffer(audio, key);
			});
		})();

		return () => {
			cancelled = true;
		};
	}, [ensureAudio, loadTrackBuffer]);

	useEffect(
		() => () => {
			const audio = audioRef.current;
			if (suspendTimeoutRef.current != null) {
				window.clearTimeout(suspendTimeoutRef.current);
				suspendTimeoutRef.current = null;
			}
			if (!audio) return;
			fadeOutAll(audio);
			try {
				void audio.ctx.close();
			} catch {
				// ignored
			}
			audioRef.current = null;
		},
		[fadeOutAll],
	);

	return {
		prepareForStart,
		pauseAmbient,
	};
}

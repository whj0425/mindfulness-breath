const DEFAULT_THRESHOLD_DB = -55;
const DEFAULT_GUARD_SECONDS = 0.02;
const MINIMUM_KEEP_SECONDS = 0.5;

export type LoopPrepResult = {
	buffer: AudioBuffer;
	loopStart: number;
	loopEnd: number;
};

export type LoopPrepOptions = {
	thresholdDb?: number;
	guardSeconds?: number;
	minimumKeepSeconds?: number;
};

/**
 * Trim encoder padding / near-silence at the head and tail of an AudioBuffer.
 * Returns a new buffer plus recommended loop points within that buffer.
 */
export function prepareLoopBuffer(
	ctx: BaseAudioContext,
	source: AudioBuffer,
	options: LoopPrepOptions = {},
): LoopPrepResult {
	const thresholdDb = options.thresholdDb ?? DEFAULT_THRESHOLD_DB;
	const guardSeconds = options.guardSeconds ?? DEFAULT_GUARD_SECONDS;
	const minimumKeepSeconds = options.minimumKeepSeconds ?? MINIMUM_KEEP_SECONDS;

	const amplitudeThreshold = Math.pow(10, thresholdDb / 20);
	const guardSamples = Math.max(0, Math.floor(source.sampleRate * guardSeconds));
	const minKeepSamples = Math.max(Math.floor(source.sampleRate * minimumKeepSeconds), 1);

	const channels = source.numberOfChannels;
	const length = source.length;
	if (length <= minKeepSamples) {
		return {
			buffer: source,
			loopStart: 0,
			loopEnd: source.duration,
		};
	}

	const channelData: Float32Array[] = [];
	for (let ch = 0; ch < channels; ch += 1) {
		channelData.push(source.getChannelData(ch));
	}

	let startIndex = 0;
	let endIndex = length;

	for (let i = 0; i < length; i += 1) {
		let maxAmp = 0;
		for (let ch = 0; ch < channels; ch += 1) {
			const sample = channelData[ch][i];
			const amp = Math.abs(sample);
			if (amp > maxAmp) maxAmp = amp;
			if (maxAmp >= amplitudeThreshold) break;
		}
		if (maxAmp >= amplitudeThreshold) {
			startIndex = Math.max(0, i - guardSamples);
			break;
		}
	}

	for (let i = length - 1; i >= 0; i -= 1) {
		let maxAmp = 0;
		for (let ch = 0; ch < channels; ch += 1) {
			const sample = channelData[ch][i];
			const amp = Math.abs(sample);
			if (amp > maxAmp) maxAmp = amp;
			if (maxAmp >= amplitudeThreshold) break;
		}
		if (maxAmp >= amplitudeThreshold) {
			endIndex = Math.min(length, i + guardSamples + 1);
			break;
		}
	}

	if (endIndex - startIndex < minKeepSamples) {
		startIndex = 0;
		endIndex = length;
	}

	const targetLength = endIndex - startIndex;
	if (startIndex === 0 && endIndex === length) {
		return {
			buffer: source,
			loopStart: 0,
			loopEnd: source.duration,
		};
	}

	const trimmed = ctx.createBuffer(channels, targetLength, source.sampleRate);
	for (let ch = 0; ch < channels; ch += 1) {
		const src = channelData[ch].subarray(startIndex, endIndex);
		trimmed.copyToChannel(src, ch, 0);
	}

	const rawLoopStart = guardSamples / trimmed.sampleRate;
	const rawLoopEnd = (targetLength - guardSamples) / trimmed.sampleRate;

	if (rawLoopEnd - rawLoopStart <= 0.01) {
		return {
			buffer: trimmed,
			loopStart: 0,
			loopEnd: trimmed.duration,
		};
	}

	const loopStart = Math.max(0, Math.min(rawLoopStart, trimmed.duration));
	const loopEnd = Math.max(loopStart + Number.EPSILON, Math.min(rawLoopEnd, trimmed.duration));

	return {
		buffer: trimmed,
		loopStart,
		loopEnd,
	};
}

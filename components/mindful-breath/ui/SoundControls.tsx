import { SOUNDS } from "../constants";
import type { SoundKey } from "../types";
import { IconMusic } from "./Icons";

type SoundControlsProps = {
	open: boolean;
	onToggle: () => void;
	onSelectSound: (key: SoundKey) => void;
	volume: number;
	onVolumeChange: (volume: number) => void;
	buttonRef: React.RefObject<HTMLButtonElement>;
	popoverRef: React.RefObject<HTMLDivElement>;
	activeKey: SoundKey;
};

export function SoundControls({
	open,
	onToggle,
	onSelectSound,
	volume,
	onVolumeChange,
	buttonRef,
	popoverRef,
	activeKey,
}: SoundControlsProps) {
	return (
		<div className="relative">
			<button
				ref={buttonRef}
				onClick={onToggle}
				className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
				aria-expanded={open}
				aria-haspopup="dialog"
			>
				<IconMusic className="h-4 w-4 text-white/70" />
				Sound
			</button>
			{open ? (
				<div
					ref={popoverRef}
					role="dialog"
					aria-label="Ambient sound settings"
					className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
				>
					<div className="grid grid-cols-2 gap-2">
						{SOUNDS.map((sound) => (
							<button
								key={sound.key}
								onClick={() => onSelectSound(sound.key)}
								className={`rounded-xl px-3 py-1.5 text-center text-xs ${
									activeKey === sound.key
										? "bg-white/15 ring-1 ring-white/20"
										: "bg-white/5 hover:bg-white/10"
								}`}
								aria-pressed={activeKey === sound.key}
							>
								{sound.label}
							</button>
						))}
					</div>
					<div className="mt-3 text-xs text-mb-muted">Volume</div>
					<input
						type="range"
						min={0}
						max={1}
						step={0.01}
						value={volume}
						onChange={(event) => onVolumeChange(Number(event.target.value))}
						className="mt-1 w-full accent-emerald-400"
						aria-label="Background sound volume"
					/>
				</div>
			) : null}
		</div>
	);
}

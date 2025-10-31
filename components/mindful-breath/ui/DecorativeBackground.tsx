export function DecorativeBackgroundLite() {
	return (
		<div
			aria-hidden
			className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
		>
			<div className="absolute -left-10 -top-24 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-blue-600/12 to-blue-500/5 blur-3xl" />
			<div className="absolute -bottom-24 -right-10 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-indigo-600/10 to-violet-600/8 blur-3xl" />
			<div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(99,102,241,0.04),transparent)]" />
		</div>
	);
}

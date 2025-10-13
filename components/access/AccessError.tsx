type AccessErrorProps = {
	title: string;
	message: string;
};

export function AccessError({ title, message }: AccessErrorProps) {
	return (
		<div className="space-y-3">
			<h1 className="text-xl font-semibold">{title}</h1>
			<p className="text-sm text-slate-200/80">{message}</p>
		</div>
	);
}

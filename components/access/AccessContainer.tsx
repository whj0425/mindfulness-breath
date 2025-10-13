type AccessContainerProps = {
	children: React.ReactNode;
};

export function AccessContainer({ children }: AccessContainerProps) {
	return (
		<div className="flex h-screen items-center justify-center px-8">
			<div className="max-w-xl text-center">{children}</div>
		</div>
	);
}

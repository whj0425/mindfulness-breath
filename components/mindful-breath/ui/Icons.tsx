import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function IconMusic({ className, ...props }: IconProps) {
	return (
		<svg
			viewBox="0 0 20 20"
			fill="currentColor"
			className={className}
			aria-hidden
			focusable="false"
			{...props}
		>
			<path d="M16.9 2.08a1.5 1.5 0 0 0-1.21-.33l-7.5 1.29A1.5 1.5 0 0 0 7 4.5v8.28a2.75 2.75 0 1 0 1.5 2.44v-6.3l6-1.03v3.59a2.75 2.75 0 1 0 1.5 2.44V3.5a1.5 1.5 0 0 0-.6-1.42Z" />
		</svg>
	);
}

export function IconChevronLeft({ className, ...props }: IconProps) {
	return (
		<svg
			viewBox="0 0 20 20"
			fill="currentColor"
			className={className}
			aria-hidden
			focusable="false"
			{...props}
		>
			<path d="M12.78 15.53a.75.75 0 0 1-1.06 0l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 1 1 1.06 1.06L9.06 10l3.72 3.72a.75.75 0 0 1 0 1.06Z" />
		</svg>
	);
}

export function IconChevronRight({ className, ...props }: IconProps) {
	return (
		<svg
			viewBox="0 0 20 20"
			fill="currentColor"
			className={className}
			aria-hidden
			focusable="false"
			{...props}
		>
			<path d="M7.22 4.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L10.94 10 7.22 6.28a.75.75 0 0 1 0-1.06Z" />
		</svg>
	);
}

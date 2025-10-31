import { headers } from "next/headers";

import { whopSdk } from "./whop-sdk";

type AccessKind = "company" | "experience";

export type AccessViewModel = {
	kind: AccessKind;
	userName: string;
	userId: string;
	username: string;
	targetName: string;
	accessLevel: string;
	hasAccess: boolean;
};

export type AccessResolution =
	| { ok: true; data: AccessViewModel }
	| { ok: false; reason: AccessErrorReason; title: string; message: string };

export type AccessErrorReason = "unauthorized" | "notFound" | "unknown";

export async function resolveAccess(
	kind: AccessKind,
	id: string,
): Promise<AccessResolution> {
	const headerList = headers();

	try {
		let userId: string;
		
		try {
			const result = await whopSdk.verifyUserToken(headerList);
			userId = result.userId;
		} catch (tokenError) {
			if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID) {
				console.warn("[whop-access] Using fallback user ID in development mode");
				userId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID;
			} else {
				throw tokenError;
			}
		}

		const [user, accessResult, target] = await Promise.all([
			whopSdk.users.getUser({ userId }),
			kind === "company"
				? whopSdk.access.checkIfUserHasAccessToCompany({
						userId,
						companyId: id,
					})
				: whopSdk.access.checkIfUserHasAccessToExperience({
						userId,
						experienceId: id,
					}),
			kind === "company"
				? whopSdk.companies.getCompany({ companyId: id })
				: whopSdk.experiences.getExperience({ experienceId: id }),
		]);

		const targetName =
			kind === "company" ? target.title ?? "Unknown company" : target.name ?? "Unknown experience";

		return {
			ok: true,
			data: {
				kind,
				userName: user.name ?? "Unknown user",
				userId,
				username: user.username ?? "unknown",
				targetName,
				accessLevel: accessResult.accessLevel,
				hasAccess: accessResult.hasAccess,
			},
		};
	} catch (error) {
		const status = getStatusCode(error);
		const reason = resolveReason(kind, status);
		const { title, message } = buildErrorCopy(kind, reason);
		if (reason === "unknown") {
			console.error(
				`[whop-access] Failed to resolve ${kind} access for ${id}`,
				error,
			);
		}
		return { ok: false, reason, title, message };
	}
}

function getStatusCode(error: unknown): number | undefined {
	if (
		typeof error === "object" &&
		error != null &&
		"status" in error &&
		typeof (error as { status?: unknown }).status === "number"
	) {
		return (error as { status: number }).status;
	}

	if (error instanceof Error && "cause" in error) {
		const cause = (error as { cause?: unknown }).cause;
		if (
			typeof cause === "object" &&
			cause != null &&
			"status" in cause &&
			typeof (cause as { status?: unknown }).status === "number"
		) {
			return (cause as { status: number }).status;
		}
	}

	return undefined;
}

function resolveReason(
	kind: AccessKind,
	status: number | undefined,
): AccessErrorReason {
	if (status === 401 || status === 403) {
		return "unauthorized";
	}
	if (status === 404) {
		return "notFound";
	}

	return "unknown";
}

function buildErrorCopy(
	kind: AccessKind,
	reason: AccessErrorReason,
): { title: string; message: string } {
	if (reason === "unauthorized") {
		return {
			title: "Access denied",
			message: "You are not authorized to view this page.",
		};
	}

	if (reason === "notFound") {
		return {
			title: kind === "company" ? "Company not found" : "Experience not found",
			message:
				kind === "company"
					? "We couldn't find a company with that ID."
					: "We couldn't find an experience with that ID.",
		};
	}

	return {
		title: "Something went wrong",
		message:
			"We ran into an unexpected issue while checking your access. Please try again.",
	};
}

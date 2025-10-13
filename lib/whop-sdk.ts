import { WhopServerSdk } from "@whop/api";

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			`[whop-sdk] Missing required environment variable: ${name}. Add it to your env configuration before starting the app.`,
		);
	}
	return value;
}

const appId = requireEnv("NEXT_PUBLIC_WHOP_APP_ID");
const appApiKey = requireEnv("WHOP_API_KEY");

export const whopSdk = WhopServerSdk({
	appId,
	appApiKey,
	onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
	companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
});

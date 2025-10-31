import { AccessContainer } from "@/components/access/AccessContainer";
import { AccessError } from "@/components/access/AccessError";
import { AccessSummary } from "@/components/access/AccessSummary";
import { resolveAccess } from "@/lib/whop-access";

type DashboardPageParams = {
	params: Promise<{ companyId: string }>;
};

export default async function DashboardPage({ params }: DashboardPageParams) {
	const { companyId } = await params;
	const result = await resolveAccess("company", companyId);

	return (
		<AccessContainer>
			{result.ok ? (
				<AccessSummary {...result.data} />
			) : (
				<AccessError title={result.title} message={result.message} />
			)}
		</AccessContainer>
	);
}

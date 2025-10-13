import { AccessContainer } from "@/components/access/AccessContainer";
import { AccessError } from "@/components/access/AccessError";
import { AccessSummary } from "@/components/access/AccessSummary";
import { resolveAccess } from "@/lib/whop-access";

type ExperiencePageParams = {
	params: { experienceId: string };
};

export default async function ExperiencePage({
	params,
}: ExperiencePageParams) {
	const { experienceId } = params;
	const result = await resolveAccess("experience", experienceId);

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

import MindfulBreath from "@/components/MindfulBreath";
import { AccessContainer } from "@/components/access/AccessContainer";
import { AccessError } from "@/components/access/AccessError";
import { resolveAccess } from "@/lib/whop-access";

type ExperiencePageParams = {
	params: Promise<{ experienceId: string }>;
};

export default async function ExperiencePage({
	params,
}: ExperiencePageParams) {
	const { experienceId } = await params;
	const result = await resolveAccess("experience", experienceId);

	if (!result.ok) {
		return (
			<AccessContainer>
				<AccessError title={result.title} message={result.message} />
			</AccessContainer>
		);
	}

	if (!result.data.hasAccess) {
		return (
			<AccessContainer>
				<AccessError
					title="Access required"
					message="You need active experience access to view this page. Please contact support if you believe this is a mistake."
				/>
			</AccessContainer>
		);
	}

	return <MindfulBreath />;
}

type AccessSummaryProps = {
	kind: "company" | "experience";
	userName: string;
	userId: string;
	username: string;
	targetName: string;
	accessLevel: string;
	hasAccess: boolean;
};

export function AccessSummary({
	kind,
	userName,
	userId,
	username,
	targetName,
	accessLevel,
	hasAccess,
}: AccessSummaryProps) {
	const noun = kind === "company" ? "company" : "experience";
	const title =
		kind === "company" ? "this company" : "this experience";
	const label = kind === "company" ? "company" : "experience";

	return (
		<h1 className="text-xl leading-relaxed">
			Hi <strong>{userName}</strong>, you{" "}
			<strong>{hasAccess ? "have" : "do not have"} access</strong> to {title}.
			{" "}Your access level to this {label} is:{" "}
			<strong>{accessLevel}</strong>.
			<br />
			<br />
			Your user ID is <strong>{userId}</strong> and your username is{" "}
			<strong>@{username}</strong>.
			<br />
			<br />
			You are viewing the {noun}: <strong>{targetName}</strong>
		</h1>
	);
}

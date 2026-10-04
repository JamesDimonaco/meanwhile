/** A civilisation's or a war's own page. */
export const itemHref = ({ kind, id }: { kind: "culture" | "war"; id: string }) => (kind === "culture" ? `/c/${id}` : `/war/${id}`);

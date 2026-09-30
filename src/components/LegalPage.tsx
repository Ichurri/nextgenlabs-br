export type LegalSection = { heading: string; body: string[] };

export function LegalPage({
  eyebrow,
  title,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-xs text-muted">Última atualização: {updated}</p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-2 text-lg font-semibold">{section.heading}</h2>
            {section.body.map((p, i) => (
              <p key={i} className="mb-3 text-sm leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

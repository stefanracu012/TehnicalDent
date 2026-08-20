/**
 * Renders **bold** spans inside an otherwise plain paragraph.
 *
 * The drafting assistant reaches for bold to mark a question or a key term, and
 * before this the asterisks were shown to the reader as asterisks. Parsed into
 * React elements rather than injected as HTML, so article text can never carry
 * markup into the page.
 */
export default function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);

  return (
    <>
      {parts.map((part, i) =>
        part.length > 4 && part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

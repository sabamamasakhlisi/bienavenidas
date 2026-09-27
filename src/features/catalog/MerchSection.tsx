import { MerchArt } from "./MerchArt";
import { SizePicker } from "./SizePicker";
import type { MerchView } from "./view";

/**
 * A merch item, laid out as in the design.
 *
 * Both arrangements come from one set of markup placed into named grid areas
 * (`.merch-layout` in `globals.css`) rather than two blocks toggled by `md:`.
 * The picker carries the chosen size, and two copies of it would mean two
 * selections that disagree the moment the window crosses the breakpoint.
 *
 * Not the `Reader`'s fold-open treatment. That exists because a shelf of books
 * shows quotes you open one at a time; there is one shirt and nothing to
 * choose between, so folding it away would hide the only thing here.
 */
export function MerchSection({
  merch,
}: {
  merch: MerchView;
}) {
  return (
    <section
      id={`merch-${merch.slug}`}
      className="scroll-mt-16 px-6 py-12 md:px-16 md:py-28"
    >
      <div className="merch-layout mx-auto w-full max-w-[var(--content-max)]">
        <h2
          style={{ gridArea: "title" }}
          className="bask-font max-w-[26ch] text-[15px] leading-snug md:text-[17px]"
        >
          {merch.title}
        </h2>

        {merch.credits && (
          <p
            style={{ gridArea: "credits" }}
            className="text-[12px] leading-relaxed whitespace-pre-line text-muted"
          >
            {merch.credits}
          </p>
        )}

        <div style={{ gridArea: "picker" }}>
          <SizePicker merch={merch} />
        </div>

        <div
          style={{
            gridArea: "art",
            aspectRatio: String(merch.imageAspect),
            containerType: "inline-size",
          }}
          className="w-full"
        >
          <MerchArt merch={merch} sizes="(max-width: 767px) 45vw, 520px" />
        </div>
      </div>
    </section>
  );
}

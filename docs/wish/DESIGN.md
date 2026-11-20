# Wish design — content2html

The project should make the transformation pipeline obvious:

source content -> structured interpretation -> reusable presentation system -> HTML output -> publication

Keep content semantics separate from visual templates. Prefer reusable components and references over one-off copied pages. GitHub Pages is currently the canonical deployment surface; provider choice is a development concern, not part of the Wish itself.

## Open-ended interaction-quality wish (2026-11-20)

The generated presentations and long-form readers should feel carefully composed: interactive controls communicate hover, keyboard focus, and pressed/selected states; icons have intentional optical size and alignment relative to captions; spacing communicates hierarchy rather than adding decorative noise. A reader must remain able to understand slides, navigation, sources and content even without animation or a mouse.

**Present-day inspiration, not a permanent requirement:** [nuro.dev](https://nuro.dev/), observed on 2026-11-20 for its subtle hover responses, icon proportions and spatial rhythm. It is one reference to evaluate, not a page to reproduce, a prescribed CSS implementation, a fixed motion duration or an exclusive future design target. Better evidence-based solutions may supersede it.

Future work should first reuse this project's existing presentation templates and tokens, compare live desktop and phone renderings, and test keyboard, touch, reduced motion, layout stability and readable/printable content. The source-to-output semantics and source fidelity remain more important than animation. **This PR expresses an aspiration only: it implements no visual or publishing changes.**

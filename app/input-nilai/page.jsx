import { loadMockup } from "../../lib/mockup";

export const dynamic = "force-static";

export default function InputNilaiPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: loadMockup("input-nilai.html") }} />
  );
}

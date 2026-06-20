import { loadMockup } from "../../lib/mockup";

export const dynamic = "force-static";

export default function SiswaPage() {
  return <div dangerouslySetInnerHTML={{ __html: loadMockup("siswa.html") }} />;
}

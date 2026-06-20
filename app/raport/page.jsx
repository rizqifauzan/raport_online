import { loadMockup } from "../../lib/mockup";

export const dynamic = "force-static";

export default function RaportPage() {
  return <div dangerouslySetInnerHTML={{ __html: loadMockup("raport.html") }} />;
}
